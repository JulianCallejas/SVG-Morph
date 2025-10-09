import React from 'react';
import { Github, Linkedin, Mail, Cpu, Zap, Code2 } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            About SVG Morph
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Advanced SVG morphing technology made accessible
          </p>
        </div>

        {/* How It Works Section */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <Cpu className="h-8 w-8 text-accent mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                How It Works
              </h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  1. Path Normalization
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  SVG paths are converted to cubic Bézier curves and normalized to 100 points using 
                  arc-length parameterization. This ensures consistent point distribution regardless 
                  of path complexity.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  2. Node Matching Algorithm
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Our k-Nearest Neighbors (k-NN) algorithm with k=1 automatically matches corresponding 
                  nodes between source and target SVGs based on Euclidean distance after bounding box 
                  normalization. For unmatched nodes, thin-plate spline interpolation fills the gaps.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  3. Interpolation & Animation
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Path data, colors, and stroke properties are interpolated using advanced easing 
                  functions. The animation engine uses requestAnimationFrame for smooth 60fps playback 
                  with SMIL and CSS fallback support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <Code2 className="h-8 w-8 text-secondary mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Tech Stack
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Frontend
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                    React 18 with TypeScript
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                    Vite for fast development
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                    Tailwind CSS for styling
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                    Zustand for state management
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  SVG Processing
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                    SVG.js for SVG manipulation
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                    D3-interpolate for smooth transitions
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                    svg-path-commander for path operations
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                    Web Workers for performance
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Developer Section */}
        <section>
          <div className="bg-gradient-to-r from-accent/10 to-secondary/10 rounded-2xl p-8 border border-accent/20">
            <div className="flex items-center mb-6">
              <Zap className="h-8 w-8 text-accent mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                About the Developer
              </h2>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="w-32 h-32 bg-gradient-to-r from-accent to-secondary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                JC
              </div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  jc-develop
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  Full-stack developer passionate about creating innovative tools for digital artists 
                  and designers. Specializing in advanced web technologies, computer graphics, and 
                  user experience design.
                </p>

                <div className="flex justify-center md:justify-start space-x-4">
                  <a
                    href="#"
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-accent transition-colors duration-200"
                  >
                    <Github className="h-5 w-5" />
                    <span>GitHub</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-accent transition-colors duration-200"
                  >
                    <Linkedin className="h-5 w-5" />
                    <span>LinkedIn</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-accent transition-colors duration-200"
                  >
                    <Mail className="h-5 w-5" />
                    <span>Contact</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};