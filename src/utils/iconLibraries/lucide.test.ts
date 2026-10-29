// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { lucideProvider } from './lucide';
import { ICON_COLOR, prepareIconSvg } from '../iconSvg';
import { parseSVG } from '../svgMorphing';

describe('lucideProvider', () => {
  it('lists the real package, searchable by icon name, as SVGs the engine can read', async () => {
    const page = await lucideProvider.list({ query: 'cloud rain', page: 1, pageSize: 24 });

    expect(page.total).toBeGreaterThan(0);
    const icon = page.items.find((item) => item.name === 'cloud-rain');
    expect(icon).toBeDefined();
    expect(icon!.svg).toContain('<svg');

    const data = parseSVG(prepareIconSvg(icon!.svg));
    expect(data.paths.length).toBeGreaterThan(0);
    expect(data.paths[0]).toMatchObject({ fill: 'none', stroke: ICON_COLOR });
    expect(data.width).toBe(24);
  });

  it('pages through the whole library', async () => {
    const first = await lucideProvider.list({ query: '', page: 1, pageSize: 48 });
    expect(first.total).toBeGreaterThan(1000);
    expect(first.items).toHaveLength(48);
    expect(first.pageCount).toBe(Math.ceil(first.total / 48));
  });
});
