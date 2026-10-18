import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Research } from './pages/Research';
import { Team } from './pages/Team';
import { Journal } from './pages/Journal';
import { Contact } from './pages/Contact';
import { NotFound } from './pages/NotFound';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="projects" element={<Projects/>}/><Route path="projects/:slug" element={<ProjectDetail/>}/><Route path="research" element={<Research/>}/><Route path="team" element={<Team/>}/><Route path="journal" element={<Journal/>}/><Route path="contact" element={<Contact/>}/><Route path="*" element={<NotFound/>}/></Route></Routes></BrowserRouter></React.StrictMode>
);