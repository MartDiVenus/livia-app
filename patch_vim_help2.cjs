const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `            onShowHelp={(topic) => {
              setShowCheatsheet(true);
              setSidebarTab('guide');
              
              const normTopic = (topic || '').toLowerCase().trim();
              const scrollToSection = (targetId: string) => {
                setTimeout(() => {
                  const el = document.getElementById(targetId);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });`;

const replaceStr = `            onShowHelp={(topic) => {
              setShowCheatsheet(true);
              setSidebarTab('guide');
              
              const normTopic = (topic || '').toLowerCase().trim();
              const scrollToSection = (targetId: string) => {
                setTimeout(() => {
                  // Ensure sidebar is visible on mobile
                  const sidebar = document.getElementById('livia-sidebar');
                  if (sidebar && window.innerWidth < 1024) {
                     sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                  
                  const el = document.getElementById(targetId);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });`;

code = code.replace(targetStr, replaceStr);

// Also add id="livia-sidebar" to the sidebar
const targetStr2 = `        {showCheatsheet && (
          <div className="flex flex-col shrink-0 relative lg:self-start">`;
          
const replaceStr2 = `        {showCheatsheet && (
          <div id="livia-sidebar" className="flex flex-col shrink-0 relative lg:self-start">`;
          
code = code.replace(targetStr2, replaceStr2);

fs.writeFileSync('src/App.tsx', code);
