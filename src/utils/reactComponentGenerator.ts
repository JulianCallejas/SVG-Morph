import { SVGData } from '../types/svg';
import type { ContourPlanEntry } from './contourPairing';
import { buildContourSmilModel, type SmilAnimation, type SmilPath } from './contourSmil';
import type { SVGData as MorphSVGData } from './svgMorphing';

// types/svg declares strokeWidth and opacity as strings, but the parsers produce numbers (and
// extra fields such as the line caps). Accept both and hand the contour code real numbers.
const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
// the studio hands over the parsers' data; older callers still use the string-typed shape
type AnySVGData = SVGData | MorphSVGData;
const toMorphData = (svg: AnySVGData): MorphSVGData => ({
  ...svg,
  paths: svg.paths.map((path) => ({
    ...path,
    strokeWidth: toNumber(path.strokeWidth),
    opacity: toNumber(path.opacity),
  })),
});

// A value taken from the user's SVG, written into the generated code as a JS string literal. JSON
// escaping keeps quotes, backslashes and line breaks from ever leaving the literal.
const literal = (value: string): string => JSON.stringify(value);
const finite = (value: number, fallback: number): number => (Number.isFinite(value) ? value : fallback);

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
  /** With a contour plan: draw the holes of filled shapes as holes. Default false. */
  keepHoles?: boolean;
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
   * Generate React component from SVG morphing data.
   * With a `contourPlan` (the playground's per-contour modes) the component is built from it
   * instead of pairing whole paths; see `generateContourComponent`.
   */
  generateComponent(
    sourceSVG: AnySVGData,
    targetSVG: AnySVGData,
    options: ReactComponentOptions,
    contourPlan?: ContourPlanEntry[]
  ): {
    component: string;
    types?: string;
    dependencies: string[];
    usage: string;
  } {
    if (contourPlan) {
      return this.generateContourComponent(sourceSVG, targetSVG, options, contourPlan);
    }

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
   * A component for a contour plan: one `<path>` per drawn contour, animated with native SMIL
   * (the same animation the SMIL export writes, verified in Chrome and Firefox), so it needs no
   * animation library: `animationType` and `styledComponents` do not apply to it. Duration, looping
   * and autoplay are props. Throws if the component name is not a valid identifier or the plan
   * references a contour that does not exist.
   */
  private generateContourComponent(
    sourceSVG: AnySVGData,
    targetSVG: AnySVGData,
    options: ReactComponentOptions,
    plan: ContourPlanEntry[]
  ): { component: string; types?: string; dependencies: string[]; usage: string } {
    const name = options.componentName;
    // Starting with a capital makes it a valid JS identifier that is never a reserved word (those are
    // all lowercase) and the only kind React treats as a component instead of an HTML tag.
    if (!/^[A-Z][\w$]*$/.test(name)) {
      throw new Error(
        `"${name}" is not a valid component name: use a JavaScript identifier that starts with an uppercase letter`
      );
    }

    const model = buildContourSmilModel(toMorphData(sourceSVG), toMorphData(targetSVG), plan, {
      keepHoles: options.keepHoles,
    });
    const ts = options.typescript;
    const props = options.includeProps;
    const width = options.responsive ? "'100%'" : String(finite(model.width, 100));
    const height = options.responsive ? "'auto'" : String(finite(model.height, 100));

    const animateJsx = (animation: SmilAnimation): string => {
      const attrs = [
        `attributeName=${literal(animation.attributeName)}`,
        animation.calcMode ? `calcMode=${literal(animation.calcMode)}` : '',
        `values={${literal(animation.values)}}`,
        animation.keyTimes ? `keyTimes=${literal(animation.keyTimes)}` : '',
        animation.keySplines ? `keySplines=${literal(animation.keySplines)}` : '',
        'dur={dur}',
        'repeatCount={repeatCount}',
      ].filter(Boolean);
      // a slide moves a shape with <animateTransform>; everything else animates an attribute
      return animation.transform
        ? `<animateTransform ${attrs.join(' ')} type=${literal(animation.transform)} />`
        : `<animate ${attrs.join(' ')} />`;
    };

    const pathJsx = (path: SmilPath): string => {
      const attrs = [
        `d={${literal(path.d)}}`,
        `fill={${literal(path.fill)}}`,
        path.fillRule ? `fillRule=${literal(path.fillRule)}` : '',
        `stroke={${literal(path.stroke)}}`,
        `strokeWidth={${finite(path.strokeWidth, 1)}}`,
        `opacity={${finite(path.opacity, 1)}}`,
        path.strokeLinecap ? `strokeLinecap={${literal(path.strokeLinecap)}}` : '',
        path.strokeLinejoin ? `strokeLinejoin={${literal(path.strokeLinejoin)}}` : '',
      ].filter(Boolean);
      if (path.animations.length === 0) return `<path ${attrs.join(' ')} />`;
      return [`<path ${attrs.join(' ')}>`, ...path.animations.map((a) => `  ${animateJsx(a)}`), '</path>'].join('\n');
    };
    const indent = (text: string, spaces: number): string =>
      text.split('\n').map((line) => ' '.repeat(spaces) + line).join('\n');

    const propsInterface = [
      `interface ${name}Props {`,
      '  width?: number | string;',
      '  height?: number | string;',
      '  /** Seconds for one cycle: source to target and back. */',
      '  duration?: number;',
      '  loop?: boolean;',
      '  autoPlay?: boolean;',
      '  className?: string;',
      '  style?: React.CSSProperties;',
      '}',
    ].join('\n');
    const types = ts && props ? propsInterface : undefined;

    const signature = props
      ? `({ width = ${width}, height = ${height}, duration = 2, loop = false, autoPlay = true, className, style }${ts ? `: ${name}Props` : ''})`
      : '()';
    const fixedValues = props
      ? []
      : [`  const width = ${width};`, `  const height = ${height};`, '  const duration = 2;', '  const loop = false;', '  const autoPlay = true;'];
    const svgProps = props ? ' className={className} style={style}' : '';
    const accessibility = options.accessibility ? ' role="img" aria-label="SVG morphing animation" focusable="false"' : '';

    const controls = options.includeControls
      ? [
          '      <div className="morph-controls">',
          '        <button type="button" onClick={() => svgRef.current?.unpauseAnimations()}>Play</button>',
          '        <button type="button" onClick={() => svgRef.current?.pauseAnimations()}>Pause</button>',
          '        <button type="button" onClick={() => svgRef.current?.setCurrentTime(0)}>Restart</button>',
          '      </div>',
        ]
      : [];

    const lines = [
      "import React, { useEffect, useRef } from 'react';",
      '',
      ...(types ? [types, ''] : []),
      '// Generated by SVG Morph from a contour plan. Each contour is one <path>: morphing pairs',
      '// animate their shape and swapped contours cross over by opacity. Native SMIL, no dependencies.',
      `const ${name} = ${signature} => {`,
      ...fixedValues,
      `  const svgRef = useRef${ts ? '<SVGSVGElement>' : ''}(null);`,
      '  const dur = `${duration}s`;',
      "  const repeatCount = loop ? 'indefinite' : 1;",
      '',
      '  useEffect(() => {',
      '    // SMIL starts by itself; only a paused start needs setting up',
      '    if (!autoPlay) svgRef.current?.pauseAnimations();',
      '  }, [autoPlay]);',
      '',
      '  return (',
      '    <div className="svg-morph-container">',
      `      <svg ref={svgRef} width={width} height={height} viewBox=${literal(model.viewBox)}${svgProps}${accessibility}>`,
      ...(model.clip
        ? [
            '        <defs>',
            `          <clipPath id="svgmorph-view"><rect x={${finite(model.clip.x, 0)}} y={${finite(model.clip.y, 0)}} width={${finite(model.clip.width, 100)}} height={${finite(model.clip.height, 100)}} /></clipPath>`,
            '        </defs>',
            '        <g clipPath="url(#svgmorph-view)">',
            ...model.paths.map((path) => indent(pathJsx(path), 10)),
            '        </g>',
          ]
        : model.paths.map((path) => indent(pathJsx(path), 8))),
      '      </svg>',
      ...controls,
      '    </div>',
      '  );',
      '};',
      '',
      options.exportType === 'default' ? `export default ${name};` : `export { ${name} };`,
    ];

    const importLine =
      options.exportType === 'default' ? `import ${name} from './${name}';` : `import { ${name} } from './${name}';`;
    const usageProps = props ? ' width={200} height={200} duration={3} loop' : '';
    const usage = [
      '// Usage Example',
      importLine,
      '',
      'function App() {',
      '  return (',
      '    <div>',
      `      <${name}${usageProps} />`,
      '    </div>',
      '  );',
      '}',
    ].join('\n');

    return {
      component: lines.join('\n'),
      types,
      dependencies: ts ? ['react', '@types/react'] : ['react'],
      usage,
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
    sourceSVG: AnySVGData,
    targetSVG: AnySVGData,
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

  private generatePaths(sourceSVG: AnySVGData, targetSVG: AnySVGData, _options: ReactComponentOptions): string {
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

  private generateAnimatedPaths(sourceSVG: AnySVGData, _targetSVG: AnySVGData, _options: ReactComponentOptions): string {
    return sourceSVG.paths.map((path, index) => {
      
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

  private generateControls(_options: ReactComponentOptions): string {
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
