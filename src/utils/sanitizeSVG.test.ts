// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { escapeForTemplateLiteral, sanitizeSVG } from './sanitizeSVG';

const SAFE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10 L90 10 L90 90 Z" fill="#ffde3a"></path></svg>';

describe('sanitizeSVG', () => {
  it('keeps a plain SVG, its viewBox and its path data', () => {
    const out = sanitizeSVG(SAFE);
    expect(out).toContain('viewBox="0 0 100 100"');
    expect(out).toContain('d="M10 10 L90 10 L90 90 Z"');
    expect(out).toContain('fill="#ffde3a"');
  });

  it('keeps gradients, groups, transforms and inline styles used for drawing', () => {
    const out = sanitizeSVG(
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><g transform="translate(5 5)"><circle cx="5" cy="5" r="4" fill="url(#g)" style="stroke:#000"/></g></svg>',
    );
    expect(out).toContain('<linearGradient');
    expect(out).toContain('stop-color="#fff"');
    expect(out).toContain('transform="translate(5 5)"');
    expect(out).toContain('fill="url(#g)"');
    expect(out).toContain('<circle');
  });

  it('drops SMIL animations by default, since they can rewrite attributes', () => {
    const out = sanitizeSVG(
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10"><animate attributeName="d" dur="1s" values="M0 0 L10 10;M0 0 L20 20"></animate></path></svg>',
    );
    expect(out).not.toContain('<animate');
    expect(out).toContain('d="M0 0 L10 10"');
  });

  it('removes script elements', () => {
    const out = sanitizeSVG('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0"/></svg>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).toContain('<path');
  });

  it('removes event handler attributes', () => {
    const out = sanitizeSVG('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path d="M0 0" onclick="alert(2)"/></svg>');
    expect(out).not.toMatch(/onload|onclick|alert/);
  });

  it('removes javascript: links', () => {
    const out = sanitizeSVG(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><path d="M0 0"/></a><a href="javascript:alert(2)"><path d="M1 1"/></a></svg>',
    );
    expect(out).not.toContain('javascript');
  });

  it('removes foreignObject and the HTML it carries', () => {
    const out = sanitizeSVG(
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><img src="x" onerror="alert(1)"/><iframe src="//evil.test"></iframe></foreignObject><path d="M0 0"/></svg>',
    );
    expect(out).not.toMatch(/foreignObject|onerror|iframe|<img/i);
  });

  it('does not let an animation rewrite a link into javascript:', () => {
    const out = sanitizeSVG(
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="#"><text>x</text><set attributeName="href" to="javascript:alert(1)"/></a></svg>',
    );
    expect(out).not.toContain('javascript');
  });

  it('returns an empty string for an empty input', () => {
    expect(sanitizeSVG('')).toBe('');
  });
});

describe('escapeForTemplateLiteral', () => {
  it('cannot end the template literal or run code inside it', () => {
    const hostile = 'a`b${alert(1)}c\\d';
    const escaped = escapeForTemplateLiteral(hostile);
    // Evaluating the escaped text inside a template literal gives back the original, so nothing executed.
    const evaluated = new Function('alert', `return \`${escaped}\`;`)(() => {
      throw new Error('code ran');
    });
    expect(evaluated).toBe(hostile);
  });

  it('leaves a normal SVG untouched', () => {
    expect(escapeForTemplateLiteral(SAFE)).toBe(SAFE);
  });
});
