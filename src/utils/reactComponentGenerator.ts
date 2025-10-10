import { SVGData } from '../types/svg';

export interface ReactComponentOptions {
  componentName: string;
  exportType: 'default' | 'named';
  typescript: boolean;
  includeProps: boolean;
  animationType: 'css' | 'framer-motion' | 'react-spring' | 'gsap';
  includeControls: boolean;
  responsive: boolean;
  accessibility: boolean;
  styledComponents: boolean;
}

export interface ComponentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'interactive' | 'animated';
  template: string;
  dependencies: string[];
  props: ComponentProp[];
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export class ReactComponentGenerator {
  private templates: Map<string, ComponentTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Generate React component from SVG morphing data
   */
  generateComponent(
    sourceSVG: SVGData,
    targetSVG: SVGData,
    options: ReactComponentOptions
  ): {
    component: string;
    types?: string;
    dependencies: string[];
    usage: string;
  } {
    const template = this.selectTemplate(options);
    const component = this.buildComponent(sourceSVG, targetSVG, options, template);
    const types = options.typescript ? this.generateTypes(options) : undefined;
    const dependencies = this.getDependencies(options);
    const usage = this.generateUsageExample(options);

    return {
      component,
      types,
      dependencies,
      usage
    };
  }

  /**
   * Get available templates
   */
  getTemplates(): ComponentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add custom template
   */
  addTemplate(template: ComponentTemplate): void {
    this.templates.set(template.id, template);
  }

  private initializeTemplates(): void {
    // Basic CSS Animation Template
    this.templates.set('css-basic', {
      id: 'css-basic',
      name: 'CSS Animation',
      description: 'Simple CSS-based morphing animation',
      category: 'basic',
      template: `
import React from 'react';
{{STYLED_IMPORTS}}

{{TYPES}}

const {{COMPONENT_NAME}} = ({{PROPS}}) => {
  return (
    <div className="svg-morph-container"{{CONTAINER_PROPS}}>
      <svg
        width="{{WIDTH}}"
        height="{{HEIGHT}}"
        viewBox="{{VIEWBOX}}"
        className="morphing-svg"
        {{ACCESSIBILITY_PROPS}}
      >
        {{PATHS}}
      </svg>
      {{CONTROLS}}
    </div>
  );
};

{{STYLES}}

export {{EXPORT_TYPE}} {{COMPONENT_NAME}};
      `,
      dependencies: ['react'],
      props: [
        { name: 'width', type: 'number', required: false, defaultValue: '100', description: 'SVG width' },
        { name: 'height', type: 'number', required: false, defaultValue: '100', description: 'SVG height' },
        { name: 'duration', type: 'number', required: false, defaultValue: '2000', description: 'Animation duration in ms' },
        { name: 'autoPlay', type: 'boolean', required: false, defaultValue: 'true', description: 'Auto-start animation' }
      ]
    });

    // Framer Motion Template
    this.templates.set('framer-motion', {
      id: 'framer-motion',
      name: 'Framer Motion',
      description: 'Advanced animations with Framer Motion',
      category: 'advanced',
      template: `
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
{{STYLED_IMPORTS}}

{{TYPES}}

const {{COMPONENT_NAME}} = ({{PROPS}}) => {
  const [isAnimating, setIsAnimating] = useState({{AUTO_PLAY}});

  const variants = {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    exit: { pathLength: 0, opacity: 0 }
  };

  return (
    <div className="svg-morph-container"{{CONTAINER_PROPS}}>
      <motion.svg
        width="{{WIDTH}}"
        height="{{HEIGHT}}"
        viewBox="{{VIEWBOX}}"
        {{ACCESSIBILITY_PROPS}}
      >
        <AnimatePresence>
          {{ANIMATED_PATHS}}
        </AnimatePresence>
      </motion.svg>
      {{CONTROLS}}
    </div>
  );
};

{{STYLES}}

export {{EXPORT_TYPE}} {{COMPONENT_NAME}};
      `,
      dependencies: ['react', 'framer-motion'],
      props: [
        { name: 'duration', type: 'number', required: false, defaultValue: '2', description: 'Animation duration in seconds' },
        { name: 'ease', type: 'string', required: false, defaultValue: 'easeInOut', description: 'Easing function' },
        { name: 'loop', type: 'boolean', required: false, defaultValue: 'false', description: 'Loop animation' }
      ]
    });
  }

  private selectTemplate(options: ReactComponentOptions): ComponentTemplate {
    const templateId = `${options.animationType}-${options.includeControls ? 'interactive' : 'basic'}`;
    return this.templates.get(templateId) || this.templates.get('css-basic')!;
  }

  private buildComponent(
    sourceSVG: SVGData,
    targetSVG: SVGData,
    options: ReactComponentOptions,
    template: ComponentTemplate
  ): string {
    let component = template.template;

    // Replace placeholders
    component = component.replace(/{{COMPONENT_NAME}}/g, options.componentName);
    component = component.replace(/{{EXPORT_TYPE}}/g, options.exportType === 'default' ? 'default' : '');
    component = component.replace(/{{WIDTH}}/g, sourceSVG.width.toString());
    component = component.replace(/{{HEIGHT}}/g, sourceSVG.height.toString());
    component = component.replace(/{{VIEWBOX}}/g, sourceSVG.viewBox);

    // Generate props
    const props = this.generateProps(options, template);
    component = component.replace(/{{PROPS}}/g, props);

    // Generate paths
    const paths = this.generatePaths(sourceSVG, targetSVG, options);
    component = component.replace(/{{PATHS}}/g, paths);
    component = component.replace(/{{ANIMATED_PATHS}}/g, this.generateAnimatedPaths(sourceSVG, targetSVG, options));

    // Generate controls
    const controls = options.includeControls ? this.generateControls(options) : '';
    component = component.replace(/{{CONTROLS}}/g, controls);

    // Generate styles
    const styles = this.generateStyles(options);
    component = component.replace(/{{STYLES}}/g, styles);

    // Generate imports and other sections
    component = component.replace(/{{STYLED_IMPORTS}}/g, this.generateStyledImports(options));
    component = component.replace(/{{TYPES}}/g, options.typescript ? this.generateTypes(options) : '');
    component = component.replace(/{{ACCESSIBILITY_PROPS}}/g, this.generateAccessibilityProps(options));
    component = component.replace(/{{CONTAINER_PROPS}}/g, this.generateContainerProps(options));
    component = component.replace(/{{AUTO_PLAY}}/g, 'true');

    return this.formatCode(component);
  }

  private generateProps(options: ReactComponentOptions, template: ComponentTemplate): string {
    if (!options.includeProps) return '';

    const props = template.props.map(prop => {
      const optional = !prop.required ? '?' : '';
      const type = options.typescript ? `: ${prop.type}` : '';
      const defaultVal = prop.defaultValue ? ` = ${prop.defaultValue}` : '';
      return `${prop.name}${optional}${type}${defaultVal}`;
    });

    return options.typescript ? `{ ${props.join(', ')} }: ${options.componentName}Props` : `{ ${props.join(', ')} }`;
  }

  private generatePaths(sourceSVG: SVGData, targetSVG: SVGData, options: ReactComponentOptions): string {
    return sourceSVG.paths.map((path, index) => {
      const targetPath = targetSVG.paths[index] || path;
      
      return `
        <path
          d="${path.d}"
          fill="${path.fill || 'none'}"
          stroke="${path.stroke || 'currentColor'}"
          strokeWidth="${path.strokeWidth || '1'}"
          className="morph-path"
          style={{
            '--target-path': '${targetPath.d}',
            '--target-fill': '${targetPath.fill || path.fill}',
            '--target-stroke': '${targetPath.stroke || path.stroke}'
          }}
        />`;
    }).join('\n        ');
  }

  private generateAnimatedPaths(sourceSVG: SVGData, targetSVG: SVGData, options: ReactComponentOptions): string {
    return sourceSVG.paths.map((path, index) => {
      const targetPath = targetSVG.paths[index] || path;
      
      return `
          <motion.path
            key="${index}"
            d="${path.d}"
            fill="${path.fill || 'none'}"
            stroke="${path.stroke || 'currentColor'}"
            strokeWidth="${path.strokeWidth || '1'}"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: duration, ease }}
          />`;
    }).join('\n          ');
  }

  private generateControls(options: ReactComponentOptions): string {
    return `
      <div className="morph-controls">
        <button onClick={() => setIsAnimating(!isAnimating)}>
          {isAnimating ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => setIsAnimating(false)}>Reset</button>
      </div>`;
  }

  private generateStyles(options: ReactComponentOptions): string {
    if (options.styledComponents) {
      return `
const StyledContainer = styled.div\`
  .morphing-svg {
    ${options.responsive ? 'width: 100%; height: auto;' : ''}
  }
  
  .morph-path {
    animation: morphPath var(--duration, 2s) ease-in-out infinite alternate;
  }
  
  @keyframes morphPath {
    to {
      d: path(var(--target-path));
      fill: var(--target-fill);
      stroke: var(--target-stroke);
    }
  }
  
  .morph-controls {
    margin-top: 1rem;
    display: flex;
    gap: 0.5rem;
  }
\`;`;
    }

    return `
const styles = {
  container: {
    ${options.responsive ? 'width: "100%",' : ''}
  },
  svg: {
    ${options.responsive ? 'width: "100%", height: "auto"' : ''}
  }
};`;
  }

  private generateStyledImports(options: ReactComponentOptions): string {
    if (options.styledComponents) {
      return "import styled from 'styled-components';";
    }
    return '';
  }

  private generateTypes(options: ReactComponentOptions): string {
    if (!options.typescript) return '';

    return `
interface ${options.componentName}Props {
  width?: number;
  height?: number;
  duration?: number;
  autoPlay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}`;
  }

  private generateAccessibilityProps(options: ReactComponentOptions): string {
    if (!options.accessibility) return '';

    return `
        role="img"
        aria-label="SVG morphing animation"
        focusable="false"`;
  }

  private generateContainerProps(options: ReactComponentOptions): string {
    const props = [];
    
    if (options.responsive) {
      props.push('style={{ width: "100%" }}');
    }
    
    return props.length > 0 ? ` ${props.join(' ')}` : '';
  }

  private getDependencies(options: ReactComponentOptions): string[] {
    const deps = ['react'];
    
    switch (options.animationType) {
      case 'framer-motion':
        deps.push('framer-motion');
        break;
      case 'react-spring':
        deps.push('@react-spring/web');
        break;
      case 'gsap':
        deps.push('gsap');
        break;
    }
    
    if (options.styledComponents) {
      deps.push('styled-components');
    }
    
    if (options.typescript) {
      deps.push('@types/react');
    }
    
    return deps;
  }

  private generateUsageExample(options: ReactComponentOptions): string {
    return `
// Usage Example
import ${options.exportType === 'default' ? options.componentName : `{ ${options.componentName} }`} from './${options.componentName}';

function App() {
  return (
    <div>
      <${options.componentName}
        width={200}
        height={200}
        duration={3000}
        autoPlay={true}
      />
    </div>
  );
}`;
  }

  private formatCode(code: string): string {
    // Basic code formatting
    return code
      .replace(/^\s*\n/gm, '') // Remove empty lines at start
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple empty lines
      .trim();
  }
}

// Export singleton instance
export const reactComponentGenerator = new ReactComponentGenerator();
