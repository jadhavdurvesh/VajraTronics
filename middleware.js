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

function continueRequest(setCookie) {
  const headers = new Headers();
  headers.set("x-middleware-next", "1");
  if (setCookie) headers.set("Set-Cookie", setCookie);
  return new Response(null, { headers });
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
    signal: AbortSignal.timeout(1800),
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
  if (!apiOrigin || !ingestToken) return continueRequest();

  let subjectRef = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  let setCookie = "";
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(subjectRef)) {
    subjectRef = randomSessionRef();
    setCookie = cookieHeader(subjectRef);
  }

  const decisionUrl = `${apiOrigin}/api/v1/decision`;
  const eventUrl = `${apiOrigin}/api/v1/events`;
  const decisionPayload = { site_id: siteId, subject_ref: subjectRef };

  try {
    // Existing restrictions are enforced before any new detection logic.
    let decision = await sentinelRequest(decisionUrl, ingestToken, decisionPayload);
    if (decision.restricted && decision.challenge_url) {
      return redirectToSentinel(decision.challenge_url, publicOrigin, setCookie) || continueRequest(setCookie);
    }

    const signal = classifyProbe(new URL(request.url));
    if (signal) {
      await sentinelRequest(eventUrl, ingestToken, {
        site_id: siteId,
        event_type: signal.event_type,
        severity: "high",
        confirmed: false,
        subject_ref: subjectRef,
        summary: signal.summary,
        source: "vercel-routing-middleware",
        evidence: { detector: "request-url-signature", raw_request_stored: false },
      });

      // The backend policy requires repeated matching high-severity signals before restriction.
      decision = await sentinelRequest(decisionUrl, ingestToken, decisionPayload);
      if (decision.restricted && decision.challenge_url) {
        return redirectToSentinel(decision.challenge_url, publicOrigin, setCookie) || continueRequest(setCookie);
      }
    }
  } catch {
    // Fail open on timeout/provider/database failure. Do not lock out legitimate traffic.
    return continueRequest(setCookie);
  }

  return continueRequest(setCookie);
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api/|assets/|fonts/|.*\\.(?:js|css|png|jpe?g|svg|webp|avif|woff2?|ttf|map|ico|xml|txt|webmanifest)$).*)"],
};
