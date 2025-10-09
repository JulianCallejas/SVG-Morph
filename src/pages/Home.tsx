import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Upload, Settings, Download, Zap, Palette, RotateCcw } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-secondary/5"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent animate-slide-up">
              SVG Morph
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 animate-slide-up">
              Morph SVGs seamlessly
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-3xl mx-auto animate-slide-up">
              An interactive tool to create smooth morphing animations between two SVG images. 
              Transform your vector graphics with precision and style.
            </p>
            <Link
              to="/playground"
              className="inline-flex items-center space-x-2 bg-accent hover:bg-accent/90 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl animate-scale-in"
            >
              <span>Start Creating</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Usage Guide */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Create stunning SVG morphing animations in just three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Upload SVGs',
                description: 'Upload two SVG files with matching dimensions (512x512). Our system validates and prepares them for morphing.',
                color: 'from-accent to-accent/70',
              },
              {
                step: '02',
                icon: Settings,
                title: 'Customize Animation',
                description: 'Fine-tune your animation with duration, easing functions, color interpolation, and advanced node mapping controls.',
                color: 'from-secondary to-secondary/70',
              },
              {
                step: '03',
                icon: Download,
                title: 'Export & Share',
                description: 'Preview your morphing animation in real-time and export as optimized SVG with SMIL or CSS animations.',
                color: 'from-purple-500 to-purple-400',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="relative group animate-slide-up"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
                <div className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center mr-4`}>
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-gray-300 dark:text-gray-600">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Advanced tools and algorithms for professional SVG morphing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: 'Auto Node Matching',
                description: 'Intelligent k-NN algorithm automatically matches corresponding nodes between SVGs for seamless morphing.',
              },
              {
                icon: Palette,
                title: 'Color Interpolation',
                description: 'Smooth color transitions with RGB interpolation and advanced stroke width animation.',
              },
              {
                icon: RotateCcw,
                title: 'Manual Pairing',
                description: 'Click-to-select interface for precise manual node pairing with visual feedback and highlighting.',
              },
              {
                icon: Settings,
                title: 'Advanced Controls',
                description: 'Comprehensive animation controls including duration, easing functions, and loop options.',
              },
              {
                icon: Zap,
                title: 'Real-time Preview',
                description: 'Instant preview of your morphing animation with play, pause, and speed controls.',
              },
              {
                icon: Download,
                title: 'Multiple Export Formats',
                description: 'Export as SMIL animations with CSS fallback, optimized for web and mobile.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Example Morphs
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              See what's possible with SVG Morph
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Circle to Square', preview: 'https://images.pexels.com/photos/1337380/pexels-photo-1337380.jpeg?auto=compress&cs=tinysrgb&w=300' },
              { title: 'Star to Heart', preview: 'https://images.pexels.com/photos/1337386/pexels-photo-1337386.jpeg?auto=compress&cs=tinysrgb&w=300' },
              { title: 'Arrow to Check', preview: 'https://images.pexels.com/photos/1337390/pexels-photo-1337390.jpeg?auto=compress&cs=tinysrgb&w=300' },
              { title: 'Logo Transform', preview: 'https://images.pexels.com/photos/1337395/pexels-photo-1337395.jpeg?auto=compress&cs=tinysrgb&w=300' },
            ].map((example, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group animate-scale-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="aspect-square bg-gradient-to-br from-accent/10 to-secondary/10 flex items-center justify-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-accent to-secondary rounded-lg animate-bounce-subtle opacity-60"></div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-accent transition-colors duration-200">
                    {example.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Smooth transition
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-accent to-secondary rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Start Morphing?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Create your first SVG morphing animation in minutes
            </p>
            <Link
              to="/playground"
              className="inline-flex items-center space-x-2 bg-white text-accent hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <span>Open Playground</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};