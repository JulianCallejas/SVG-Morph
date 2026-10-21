import DOMPurify from 'dompurify';

/**
 * Makes an SVG string safe to inject into the page (innerHTML, dangerouslySetInnerHTML).
 * User files are untrusted: an SVG can carry scripts, event handlers and javascript: links.
 * Use it only for display. The morphing engine keeps working on the original string.
 * SMIL animations are dropped too, because they can rewrite an attribute such as href at runtime.
 * It fails closed: with no DOM available it returns an empty string, never the raw input.
 */
export const sanitizeSVG = (svg: string): string => {
  if (!svg || !DOMPurify.isSupported) return '';

  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'set'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus'],
  });
};

// Escapes a string so it can sit inside a template literal of generated code without ending it or running code.
export const escapeForTemplateLiteral = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
