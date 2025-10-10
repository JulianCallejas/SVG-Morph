import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shapes, Home, Play, Info, Zap, Layers, Box } from 'lucide-react';

export const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/playground', icon: Play, label: 'Playground' },
    { path: '/playground-enhanced', icon: Zap, label: 'Enhanced', badge: 'Pro' },
    { path: '/multi-stage', icon: Layers, label: 'Multi-Stage', badge: 'NEW' },
    { path: '/3d-morphing', icon: Box, label: '3D Studio', badge: '3D' },
    { path: '/about', icon: Info, label: 'About' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-primary/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Shapes className="h-8 w-8 text-accent group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              SVG Morph
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex space-x-1">
            {navItems.map(({ path, icon: Icon, label, badge }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">{label}</span>
                  {badge && (
                    <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                      badge === 'NEW' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                        : badge === 'Pro'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};