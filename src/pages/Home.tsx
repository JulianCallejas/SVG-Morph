import { Link } from 'react-router-dom';
import { 
  ArrowRight, Upload, Layers, Search, Scissors, Code, Box,
  Play, Video, Share2, Sparkles, Cpu, Monitor, Gamepad2, Wand2, Brush, Target, Clock, 
  FileText, Globe, Laptop, Camera, Film, Users, Heart, Star,
  Gauge, Shield, Lightbulb, Workflow, Sliders, MousePointer, Keyboard, Eye,
  Zap as Lightning, Rocket, Award, CheckCircle, TrendingUp
} from 'lucide-react';

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
              Professional SVG Morphing Studio
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-3xl mx-auto animate-slide-up">
              Create stunning morphing animations with advanced AI-powered node matching, 3D visualization, 
              multi-format export, social sharing, and professional-grade tools for designers and developers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/playground-enhanced"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl animate-scale-in"
              >
                <Rocket className="h-5 w-5" />
                <span>AI Studio</span>
                <span className="ml-2 px-2 py-1 text-xs bg-white/20 rounded-full">PRO</span>
              </Link>
              <Link
                to="/3d-morphing"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl animate-scale-in relative"
              >
                <Box className="h-5 w-5" />
                <span>3D Studio</span>
                <span className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-yellow-400 text-yellow-900 rounded-full font-bold">
                  3D
                </span>
              </Link>
              <Link
                to="/multi-stage"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl animate-scale-in"
              >
                <Layers className="h-5 w-5" />
                <span>Multi-Stage</span>
              </Link>
              <Link
                to="/playground"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl animate-scale-in"
              >
                <Play className="h-4 w-4" />
                <span>Classic</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Guide */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent/10 to-secondary/10 text-accent rounded-full font-medium mb-4">
              <Workflow className="h-4 w-4" />
              Professional Workflow
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Create professional-grade SVG morphing animations with AI-powered tools and advanced features
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Upload & Analyze',
                description: 'Upload SVG files with automatic validation, complexity analysis, and AI-powered optimization. Supports multiple formats including AI, EPS, and PDF conversion.',
                color: 'from-accent to-accent/70',
              },
              {
                step: '02',
                icon: Wand2,
                title: 'AI-Powered Matching',
                description: 'Advanced k-NN algorithms automatically match nodes with manual override options. Interactive pairing interface with real-time preview and physics simulation.',
                color: 'from-secondary to-secondary/70',
              },
              {
                step: '03',
                icon: Share2,
                title: 'Export & Share',
                description: 'Export to 15+ formats including JavaScript, React components, 3D models (OBJ/STL/GLTF), videos (MP4/GIF), and share directly to social platforms.',
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

      {/* 3D Studio Highlight */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-full font-medium mb-4">
              <Box className="h-4 w-4" />
              3D Studio
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Professional 3D Morphing & Export
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Transform SVG morphing into 3D models with industry-standard export formats for 3D printing, CAD, and professional software
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                icon: Box,
                title: '3D Visualization',
                description: 'Real-time 3D preview with Three.js integration, interactive controls for geometry, materials, and lighting.',
                color: 'from-purple-500 to-purple-600',
                link: '/3d-morphing',
              },
              {
                icon: FileText,
                title: 'Universal Formats',
                description: 'Export to OBJ, STL, PLY, and GLTF formats compatible with Paint 3D, Blender, 3ds Max, Maya, and SketchUp.',
                color: 'from-blue-500 to-blue-600',
                link: '/3d-morphing',
              },
              {
                icon: Target,
                title: '3D Printing Ready',
                description: 'STL format optimized for 3D printing with configurable quality settings and model centering.',
                color: 'from-green-500 to-green-600',
                link: '/3d-morphing',
              },
              {
                icon: Sparkles,
                title: 'Professional Quality',
                description: 'Advanced export options with material properties, normal vectors, and scaling for different use cases.',
                color: 'from-pink-500 to-pink-600',
                link: '/3d-morphing',
              },
            ].map((feature, index) => (
              <Link
                key={index}
                to={feature.link}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group block"
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100 group-hover:text-purple-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/3d-morphing"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg mr-4"
            >
              <Box className="h-5 w-5" />
              <span>Try 3D Studio</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Compatible with Paint 3D, Blender, 3ds Max, Maya, SketchUp
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium mb-4">
              <Lightning className="h-4 w-4" />
              Phase 4 Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Advanced Morphing & Export Suite
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Physics simulation, video export, social sharing, gradient morphing, and comprehensive performance optimization
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                icon: Video,
                title: 'Video Export',
                description: 'Export animations as GIF, MP4, or WebM with configurable quality, frame rate, and resolution settings.',
                color: 'from-blue-500 to-blue-600',
              },
              {
                icon: Users,
                title: 'Social Sharing',
                description: 'Direct sharing to Twitter, Facebook, Instagram, LinkedIn, Pinterest, Reddit, and Tumblr with optimization.',
                color: 'from-purple-500 to-purple-600',
              },
              {
                icon: Cpu,
                title: 'Physics Simulation',
                description: 'Spring-based animations with elastic bounce, damping, and gravity effects for realistic motion.',
                color: 'from-green-500 to-green-600',
              },
              {
                icon: Brush,
                title: 'Gradient Morphing',
                description: 'Advanced gradient transitions with color space interpolation and automatic gradient matching.',
                color: 'from-orange-500 to-orange-600',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
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
          
          <div className="text-center mt-12">
            <Link
              to="/playground-enhanced"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Lightning className="h-5 w-5" />
              <span>Try Phase 4 Features</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* JavaScript & Export Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium mb-4">
              <Code className="h-4 w-4" />
              Developer Tools
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Code Export & Integration
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Export animations as JavaScript code, React components, and integrate with popular frameworks
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Code,
                title: 'JavaScript Export',
                description: 'Generate standalone JavaScript code with Vanilla JS, GSAP, or Anime.js. No dependencies required for Vanilla option.',
                color: 'from-yellow-500 to-yellow-600',
              },
              {
                icon: Scissors,
                title: 'React Components',
                description: 'Export as ready-to-use React components with TypeScript support and customizable props.',
                color: 'from-blue-500 to-blue-600',
              },
              {
                icon: Globe,
                title: 'Multi-Platform',
                description: 'Compatible with all major browsers and frameworks. Optimized for web, mobile, and desktop applications.',
                color: 'from-purple-500 to-purple-600',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
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

      {/* Performance & UX Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent/10 to-secondary/10 text-accent rounded-full font-medium mb-4">
              <Gauge className="h-4 w-4" />
              Performance & UX
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Professional User Experience
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Advanced performance monitoring, interactive tutorials, keyboard shortcuts, and comprehensive error handling
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Monitor,
                title: 'Performance Monitor',
                description: 'Real-time FPS counter, memory usage tracking, and performance optimization suggestions.',
                color: 'from-blue-500 to-blue-600',
              },
              {
                icon: Keyboard,
                title: 'Keyboard Shortcuts',
                description: 'Comprehensive keyboard shortcuts for all major functions with customizable key bindings.',
                color: 'from-purple-500 to-purple-600',
              },
              {
                icon: Eye,
                title: 'Interactive Tutorial',
                description: 'Step-by-step guided onboarding with contextual help and progress tracking.',
                color: 'from-green-500 to-green-600',
              },
              {
                icon: Shield,
                title: 'Error Boundaries',
                description: 'Graceful error recovery with user-friendly messages and automatic retry mechanisms.',
                color: 'from-red-500 to-red-600',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
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

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent/10 to-secondary/10 text-accent rounded-full font-medium mb-4">
              <Lightbulb className="h-4 w-4" />
              Core Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Advanced Morphing Engine
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powered by AI algorithms, Web Workers, and professional-grade tools for seamless SVG morphing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                title: 'AI Node Matching',
                description: 'Advanced k-NN algorithms with KD-Tree optimization automatically match corresponding nodes with 95%+ accuracy.',
              },
              {
                icon: Sliders,
                title: 'Real-time Adjustment',
                description: 'Live parameter tweaking during animation playback with categorized controls and visual feedback.',
              },
              {
                icon: MousePointer,
                title: 'Interactive Pairing',
                description: 'Click-to-select interface with undo/redo, connection lines, and confidence scoring for manual overrides.',
              },
              {
                icon: Clock,
                title: 'Keyframe Timeline',
                description: 'Visual timeline editor with draggable keyframes, zoom controls, and precise timing adjustments.',
              },
              {
                icon: Film,
                title: 'Multi-Stage Morphing',
                description: 'Create complex animation sequences with multiple SVGs (A → B → C → D) and custom transitions.',
              },
              {
                icon: TrendingUp,
                title: '15+ Export Formats',
                description: 'Export to SVG, JavaScript, React, 3D models, videos, and share directly to social platforms.',
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent/10 to-secondary/10 text-accent rounded-full font-medium mb-4">
              <Star className="h-4 w-4" />
              Showcase Gallery
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Professional Results
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From simple shapes to complex logos - see what's possible with our advanced morphing engine
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                title: 'Logo Morphing', 
                description: 'Complex brand transitions',
                icon: Award,
                gradient: 'from-purple-500 to-pink-500'
              },
              { 
                title: '3D Visualization', 
                description: 'Real-time 3D preview',
                icon: Camera,
                gradient: 'from-blue-500 to-cyan-500'
              },
              { 
                title: 'Physics Animation', 
                description: 'Spring-based motion',
                icon: Gamepad2,
                gradient: 'from-green-500 to-emerald-500'
              },
              { 
                title: 'Social Sharing', 
                description: 'Direct platform export',
                icon: Heart,
                gradient: 'from-red-500 to-rose-500'
              },
            ].map((example, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group animate-scale-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <div className={`w-20 h-20 bg-gradient-to-r ${example.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <example.icon className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-accent transition-colors duration-200 mb-2">
                    {example.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {example.description}
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
              Experience the future of SVG morphing with AI-powered tools, 3D visualization, and professional export options
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/playground-enhanced"
                className="inline-flex items-center space-x-2 bg-white text-accent hover:bg-gray-100 px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <Rocket className="h-5 w-5" />
                <span>AI Studio</span>
              </Link>
              <Link
                to="/3d-morphing"
                className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
              >
                <Box className="h-5 w-5" />
                <span>3D Studio</span>
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-8 text-white/70 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                15+ Export Formats
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Social Sharing
              </span>
              <span className="flex items-center gap-1">
                <Laptop className="h-4 w-4" />
                Cross-Platform
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};