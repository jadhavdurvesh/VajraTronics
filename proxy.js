import { next } from "@vercel/functions";

/*
 * SENTINEL edge connector for VajraTronics.
 * Runs only on document/navigation requests; static assets are excluded by matcher.
 * Fail-open: if SENTINEL is unavailable or not configured, VajraTronics remains reachable.
 * Does not inspect request bodies, store raw URLs, or block Developer Tools.
 */
const COOKIE_NAME = "__Host-vt_sentinel_sid";
const DEFAULT_SITE_ID = "vajratronics";

function readCookie(header, name) {
  if (!header) return "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

function randomSessionRef() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function cookieHeader(value) {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=86400; Secure; HttpOnly; SameSite=Lax`;
}

function continueRequest(setCookie, status = "pass-through") {
  const headers = new Headers();
  if (setCookie) headers.set("Set-Cookie", setCookie);
  // Enable this header only while diagnosing a deployment; it reveals no credentials.
  if (process.env.SENTINEL_DEBUG === "true") {
    headers.set("X-SENTINEL-Middleware", "active");
    headers.set("X-SENTINEL-Check", status);
  }
  return next({ headers });
}

function redirectToSentinel(challengePath, publicOrigin, setCookie) {
  const target = new URL(challengePath, publicOrigin);
  const expected = new URL(publicOrigin);
  if (target.origin !== expected.origin || target.pathname !== "/visitor" || !target.hash.startsWith("#challenge=")) {
    return null;
  }
  const headers = new Headers({
    Location: target.toString(),
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Referrer-Policy": "no-referrer",
  });
  if (setCookie) headers.set("Set-Cookie", setCookie);
  return new Response(null, { status: 302, headers });
}


function diagnosticCode(error, stage) {
  const message = error instanceof Error ? error.message : String(error || "");
  const status = message.match(/SENTINEL API HTTP (\\d{3})/);
  if (status) return `${stage}-http-${status[1]}`;
  if (/timeout|timed out|abort/i.test(message)) return `${stage}-timeout`;
  return `${stage}-network-error`;
}


function safeHeader(request, name, max = 180) {
  const value = request.headers.get(name);
  if (!value) return null;
  return Array.from(value).filter(char => { const code = char.charCodeAt(0); return code >= 32 && code !== 127; }).join("").slice(0, max);
}

function securityEvidence(request, url, signal) {
  const forwarded = safeHeader(request, "x-forwarded-for", 180);
  const clientIp = forwarded ? forwarded.split(",")[0].trim().slice(0, 64) : null;
  const rawCity = safeHeader(request, "x-vercel-ip-city", 100);
  let city = rawCity;
  try { if (rawCity) city = decodeURIComponent(rawCity).slice(0, 100); } catch {}
  return {
    detector: "request-url-signature",
    signature: signal.event_type,
    raw_request_stored: false,
    request_method: request.method,
    request_path: url.pathname.slice(0, 500),
    client_ip: clientIp,
    client_ip_source: clientIp ? "vercel-x-forwarded-for" : null,
    user_agent: safeHeader(request, "user-agent", 300),
    geo: {
      country: safeHeader(request, "x-vercel-ip-country", 2),
      region: safeHeader(request, "x-vercel-ip-country-region", 8),
      city,
      continent: safeHeader(request, "x-vercel-ip-continent", 2),
      timezone: safeHeader(request, "x-vercel-ip-timezone", 80),
    },
    edge_request_id: safeHeader(request, "x-vercel-id", 200),
  };
}

function classifyProbe(url) {
  let path = url.pathname;
  let search = url.search;
  try { path = decodeURIComponent(path); } catch {}
  try { search = decodeURIComponent(search); } catch {}
  const target = `${path} ${search}`.toLowerCase();

  // Credential/configuration-file discovery and traversal probes.
  if (/(?:^|\/)(?:\.env(?:\.[a-z0-9_-]+)?|\.git\/config|wp-config\.php|\.htpasswd|server-status)(?:\/|$)/i.test(path) ||
      /(?:\.\.|%2e%2e)(?:\/|%2f)/i.test(url.pathname) ||
      /\/actuator\/env(?:\/|$)/i.test(path) ||
      /\/etc\/passwd/i.test(path)) {
    return { event_type: "unauthorized_resource_access", summary: "High-confidence sensitive-path discovery probe" };
  }

  // Strong SQL injection signatures; ordinary words such as "select" are not sufficient.
  if (/(?:union(?:\s|\+|%20)+select|(?:\x27|%27)\s*(?:or|and)\s*(?:\x27|%27|\d)|sleep\s*\(|benchmark\s*\()/i.test(target)) {
    return { event_type: "sql_injection_signal", summary: "High-confidence SQL injection signature in request URL" };
  }

  // Script execution payload signatures in path/query only.
  if (/(?:<script\b|%3cscript|javascript\s*:|onerror\s*=|onload\s*=)/i.test(target)) {
    return { event_type: "xss_signal", summary: "High-confidence script-injection signature in request URL" };
  }
  return null;
}

async function sentinelRequest(url, token, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) throw new Error(`SENTINEL API HTTP ${response.status}`);
  return response.json();
}

export default async function middleware(request) {
  const apiOrigin = (process.env.SENTINEL_API_URL || "").replace(/\/$/, "");
  const publicOrigin = process.env.SENTINEL_PUBLIC_ORIGIN || "https://project-sentinel-ivory.vercel.app";
  const ingestToken = process.env.SENTINEL_INGEST_TOKEN || "";
  const siteId = process.env.SENTINEL_SITE_ID || DEFAULT_SITE_ID;

  // Never break public availability because an optional security service is misconfigured.
  if (!apiOrigin || !ingestToken) {
    console.error("[SENTINEL] Middleware active but API URL or ingest token is missing.");
    return continueRequest("", "unconfigured");
  }

  let subjectRef = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  let setCookie = "";
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(subjectRef)) {
    subjectRef = randomSessionRef();
    setCookie = cookieHeader(subjectRef);
  }

  const decisionUrl = `${apiOrigin}/api/v1/decision`;
  const eventUrl = `${apiOrigin}/api/v1/events`;
  const decisionPayload = { site_id: siteId, subject_ref: subjectRef };

  // First check whether this browser already has a restriction.
  try {
    const decision = await sentinelRequest(decisionUrl, ingestToken, decisionPayload);
    if (decision.restricted && decision.challenge_url) {
      console.warn("[SENTINEL] Existing restriction enforced for this session.");
      return redirectToSentinel(decision.challenge_url, publicOrigin, setCookie) || continueRequest(setCookie, "invalid-challenge-url");
    }
  } catch (error) {
    // A failed restriction lookup must not prevent us from recording a new probe.
    console.error("[SENTINEL] Restriction lookup failed:", error instanceof Error ? error.message : "unknown error");
  }

  const signal = classifyProbe(new URL(request.url));
  if (!signal) return continueRequest(setCookie, "checked-no-signal");

  try {
    const event = await sentinelRequest(eventUrl, ingestToken, {
      site_id: siteId,
      event_type: signal.event_type,
      severity: "high",
      confirmed: false,
      subject_ref: subjectRef,
      summary: signal.summary,
      source: "vercel-routing-middleware",
      evidence: securityEvidence(request, new URL(request.url), signal),
    });

    console.info("[SENTINEL] Security signal submitted:", signal.event_type, "incident:", event.incident_id);

    // The event endpoint returns a signed URL if this signal creates a restriction.
    if (event.restriction_created && event.challenge_url) {
      console.warn("[SENTINEL] Restriction created; redirecting the flagged session.");
      return redirectToSentinel(event.challenge_url, publicOrigin, setCookie) || continueRequest(setCookie, "invalid-challenge-url");
    }
    return continueRequest(setCookie, "signal-recorded");
  } catch (error) {
    const status = diagnosticCode(error, "event");
    console.error("[SENTINEL] Event submission failed:", status);
    return continueRequest(setCookie, status);
  }
}

