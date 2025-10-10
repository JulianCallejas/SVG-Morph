import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { ProcessingIndicator } from './components/ProcessingIndicator';
import { ToastProvider } from './contexts/ToastContext';
import { Home } from './pages/Home';
import { Playground } from './pages/Playground';
import { PlaygroundEnhanced } from './pages/PlaygroundEnhanced';
import { About } from './pages/About';

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-primary text-gray-900 dark:text-gray-100 transition-colors duration-300">
          <Navigation />
          <ProcessingIndicator />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/playground-enhanced" element={<PlaygroundEnhanced />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;