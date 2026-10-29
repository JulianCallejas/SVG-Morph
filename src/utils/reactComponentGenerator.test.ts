import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import type { SVGData as ReactSVGData } from '../types/svg';
import type { SVGData } from './svgMorphing';
import { planContours } from './contourSvg';
import { reactComponentGenerator, type ReactComponentOptions } from './reactComponentGenerator';

// The generator is typed with types/svg (string widths) but receives the parsers' numeric data.
const forReact = (data: SVGData): ReactSVGData => data as unknown as ReactSVGData;

// `d` attributes of the two reference icons (see contours.test.ts)
const CLOUD_ARROW_D =
  'M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18';
const CLOUD_BOLT_D =
  'M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417';

const svg = (d: string, extra = {}): SVGData => ({
  paths: [{ d, fill: 'none', stroke: '#FFFFFF', strokeWidth: 2, strokeLinecap: 'round', ...extra }],
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
});

const source = svg(CLOUD_ARROW_D);
const target = svg(CLOUD_BOLT_D);
const { plan } = planContours(source, target)!;

const options = (overrides: Partial<ReactComponentOptions> = {}): ReactComponentOptions => ({
  componentName: 'MorphIcon',
  exportType: 'default',
  typescript: false,
  includeProps: true,
  animationType: 'css',
  includeControls: false,
  responsive: false,
  accessibility: true,
  styledComponents: false,
  ...overrides,
});

// Turns generated source into a real component: TypeScript strips types and JSX, then the module
// is evaluated with only React available.
type Component = React.ComponentType<Record<string, unknown>>;
type Loaded = { default: Component; [name: string]: unknown };

function load(code: string): Loaded {
  const result = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const problems = (result.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  if (problems.length > 0) throw new Error(`Generated code does not compile:\n${problems.join('\n')}`);

  const module = { exports: {} as Loaded };
  const requireStub = (id: string) => {
    if (id === 'react') return React;
    throw new Error(`Unexpected import "${id}"`);
  };
  new Function('require', 'module', 'exports', result.outputText)(requireStub, module, module.exports);
  return module.exports;
}

const render = (Component: Component, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(React.createElement(Component, props));
const count = (haystack: string, needle: RegExp) => (haystack.match(needle) ?? []).length;

describe('contour-aware React component', () => {
  const generate = (overrides: Partial<ReactComponentOptions> = {}) =>
    reactComponentGenerator.generateComponent(forReact(source), forReact(target), options(overrides), plan);

  it('compiles and renders one path per drawn contour', () => {
    const Component = load(generate().component).default;

    const html = render(Component);

    // cloud and shaft morph, the two arrowheads fade out
    expect(count(html, /<path /g)).toBe(4);
    expect(html).toContain('viewBox="0 0 24 24"');
  });

  it('animates with SMIL and never with <set>', () => {
    const html = render(load(generate().component).default);

    expect(html).toContain('attributeName="d"');
    expect(html).toContain('attributeName="opacity"');
    expect(html).not.toMatch(/<set[\s>]/);
  });

  it('takes the duration and looping from props', () => {
    const Component = load(generate().component).default;

    const defaults = render(Component);
    const custom = render(Component, { duration: 5, loop: true });

    expect(defaults).toContain('dur="2s"');
    expect(defaults).toContain('repeatCount="1"');
    expect(custom).toContain('dur="5s"');
    expect(custom).toContain('repeatCount="indefinite"');
  });

  it('keeps the round caps of the SVG', () => {
    const html = render(load(generate().component).default);

    expect(html).toContain('stroke-linecap="round"');
  });

  it('is plain React: no animation library to install', () => {
    const result = generate({ animationType: 'framer-motion', styledComponents: true });

    expect(result.dependencies).toEqual(['react']);
    expect(() => load(result.component)).not.toThrow();
  });

  it('compiles as TypeScript with its props typed', () => {
    const result = generate({ typescript: true });

    expect(result.component).toContain('interface MorphIconProps');
    expect(result.types).toContain('interface MorphIconProps');
    expect(result.dependencies).toEqual(['react', '@types/react']);
    expect(() => load(result.component)).not.toThrow();
  });

  it('adds working controls only when asked', () => {
    const plain = render(load(generate().component).default);
    const withControls = render(load(generate({ includeControls: true }).component).default);

    expect(count(plain, /<button/g)).toBe(0);
    expect(count(withControls, /<button/g)).toBe(3);
  });

  it('supports a named export', () => {
    const exports = load(generate({ exportType: 'named' }).component);

    expect(typeof exports.MorphIcon).toBe('function');
    expect(exports.default).toBeUndefined();
  });

  it('can be responsive and accessible', () => {
    const html = render(load(generate({ responsive: true }).component).default);

    expect(html).toContain('role="img"');
    expect(html).toContain('width="100%"');
  });

  it('gives the example the props the component really has', () => {
    expect(generate().usage).toContain('duration={3}');
  });

  it('refuses a component name that is not a valid identifier', () => {
    expect(() => generate({ componentName: 'My Icon' })).toThrow(/valid component name/i);
    expect(() => generate({ componentName: 'A;alert(1)' })).toThrow(/valid component name/i);
  });

  it('refuses reserved words and lowercase names, which React would not treat as a component', () => {
    // `class` and `default` are reserved; `icon` would be rendered as an HTML tag in the usage example
    for (const name of ['class', 'default', 'icon', 'export']) {
      expect(() => generate({ componentName: name })).toThrow(/valid component name/i);
    }
  });

  it('accepts names with digits, underscores and dollar signs after the first capital', () => {
    expect(() => generate({ componentName: 'Icon2_$' })).not.toThrow();
  });

  it('cannot be broken by hostile values in the SVG', () => {
    const hostile = svg('M0 0 L10 0', { stroke: '"/><script>alert(1)</script><x a="' });
    const hostilePlan = planContours(hostile, hostile)!.plan;

    const code = reactComponentGenerator.generateComponent(
      forReact(hostile),
      forReact(hostile),
      options(),
      hostilePlan,
    ).component;
    const html = render(load(code).default);

    expect(html).not.toContain('<script>');
  });

  it('throws when the plan references a contour that does not exist', () => {
    const bad = [{ sourceId: 'nope', targetId: null, mode: 'swap' as const, swapAt: 0.5, fadeWindow: 0 }];

    expect(() =>
      reactComponentGenerator.generateComponent(forReact(source), forReact(target), options(), bad),
    ).toThrow(/nope/);
  });
});

describe('React component without a contour plan', () => {
  it('keeps the whole-path generator exactly as before', () => {
    const { component } = reactComponentGenerator.generateComponent(forReact(source), forReact(target), options());

    expect(component).toContain('morph-path');
    expect(component).toContain('--target-path');
    expect(component).not.toContain('<animate');
  });
});

describe('React component with sliding contours', () => {
  const sliding = plan.map((entry) =>
    entry.mode === 'swap'
      ? { ...entry, fadeWindow: 0.2, transition: { type: 'slide' as const, direction: 'left' as const, fade: false } }
      : entry,
  );
  const code = reactComponentGenerator.generateComponent(forReact(source), forReact(target), options(), sliding).component;

  it('moves the contours with animateTransform and clips them to the drawing', () => {
    expect(code).toContain('<animateTransform');
    expect(code).toContain('type="translate"');
    expect(code).toContain('<clipPath id="svgmorph-view">');
    expect(code).toContain('<g clipPath="url(#svgmorph-view)">');
  });

  it('compiles and renders with the clip around its paths', () => {
    const html = render(load(code).default);

    expect(html).toContain('<clipPath id="svgmorph-view">');
    expect(html).toContain('clip-path="url(#svgmorph-view)"');
    expect(html).toContain('<animateTransform');
  });

  it('leaves a component without slides with no clip and no transform animation', () => {
    const plain = reactComponentGenerator.generateComponent(forReact(source), forReact(target), options(), plan).component;

    expect(plain).not.toContain('animateTransform');
    expect(plain).not.toContain('clipPath');
  });
});

describe('React component with keepHoles', () => {
  const donut = (fill: string, d: string): SVGData => ({
    paths: [{ d, fill, stroke: 'none', strokeWidth: 1 }],
    viewBox: '0 0 100 100',
    width: 100,
    height: 100,
  });
  const a = donut('#ff0000', 'M0 0 H100 V100 H0 Z M25 25 V75 H75 V25 Z');
  const b = donut('#0000ff', 'M5 5 H95 V95 H5 Z M30 30 V70 H70 V30 Z');
  const donutPlan = planContours(a, b)!.plan;
  const generate = (overrides: Partial<ReactComponentOptions> = {}) =>
    reactComponentGenerator.generateComponent(forReact(a), forReact(b), options(overrides), donutPlan).component;

  it('renders the donut as one even-odd path that still compiles', () => {
    const html = render(load(generate({ keepHoles: true })).default);

    expect(count(html, /<path /g)).toBe(1);
    expect(html).toContain('fill-rule="evenodd"');
  });

  it('is the same component as before when it is off or not given', () => {
    const before = generate();

    expect(generate({ keepHoles: false })).toBe(before);
    expect(count(render(load(before).default), /<path /g)).toBe(2);
    expect(before).not.toContain('fillRule');
  });
});
