// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { phosphorProvider, tablerProvider } from './iconifyPackages';
import { prepareIconSvg } from '../iconSvg';
import { parseSVG } from '../svgMorphing';
import { planContours } from '../contourSvg';
import { holeGroups } from '../contourHoleGroups';

describe.each([
  ['tabler', tablerProvider, 'arrow-up', 24],
  ['phosphor', phosphorProvider, 'arrow-up', 256],
])('%s provider', (_name, provider, search, size) => {
  it('is local and not remote', () => {
    expect(provider.remote).toBe(false);
    expect(provider.license).toBe('MIT');
  });

  it('lists the bundled set, searchable, as SVGs the engine can read in the set size', async () => {
    const page = await provider.list({ query: search, page: 1, pageSize: 24 });

    expect(page.total).toBeGreaterThan(0);
    const icon = page.items.find((item) => item.name === search);
    expect(icon).toBeDefined();

    const data = parseSVG(prepareIconSvg(icon!.svg));
    expect(data.paths.length).toBeGreaterThan(0);
    expect(data.width).toBe(size);
    expect(data.viewBox).toBe(`0 0 ${size} ${size}`);
  });

  it('pages through thousands of icons, rendering only the page', async () => {
    const page = await provider.list({ query: '', page: 2, pageSize: 48 });
    expect(page.total).toBeGreaterThan(1000);
    expect(page.items).toHaveLength(48);
    expect(page.page).toBe(2);
  });
});

describe('hollow Phosphor icons', () => {
  it('keep their hole: the outline and the inner contour of an icon are grouped while it morphs', async () => {
    const load = async (name: string) => {
      const page = await phosphorProvider.list({ query: name, page: 1, pageSize: 96 });
      return parseSVG(prepareIconSvg(page.items.find((item) => item.name === name)!.svg));
    };
    const planned = planContours(await load('airplane'), await load('airplane-landing'))!;

    const found = holeGroups(planned.plan, planned.sourceContours, planned.targetContours);

    expect(found).toHaveLength(1);
    expect(planned.plan[found[0].outer].mode).toBe('morph');
    expect(found[0].holes).toHaveLength(1);
  });
});
