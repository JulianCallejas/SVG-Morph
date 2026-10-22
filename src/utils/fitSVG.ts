// Makes every SVG under `root` fit whole inside its box (scaled to the width or the height,
// whichever is tighter), whatever size its own attributes ask for. Without a viewBox the size
// attributes become one, so the drawing can scale at all.
export const fitSVGs = (root: Element): void => {
  root.querySelectorAll('svg').forEach((svg) => {
    if (!svg.hasAttribute('viewBox')) {
      const width = svg.getAttribute('width') ?? '';
      const height = svg.getAttribute('height') ?? '';
      if (!width.includes('%') && !height.includes('%') && parseFloat(width) > 0 && parseFloat(height) > 0) {
        svg.setAttribute('viewBox', `0 0 ${parseFloat(width)} ${parseFloat(height)}`);
      }
    }
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';
  });
};
