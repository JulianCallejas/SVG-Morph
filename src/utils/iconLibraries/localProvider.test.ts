// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createLocalProvider } from './localProvider';
import { toKebabCase } from './lucide';

const svgFor = (name: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>${name}</title><path d="M0 0 L24 24" onclick="x()"/></svg>`;

const makeProvider = (names: string[]) => {
  const load = vi.fn().mockResolvedValue({ names, render: svgFor });
  return { load, provider: createLocalProvider({ id: 't', label: 'Test', license: 'MIT', load }) };
};

describe('createLocalProvider', () => {
  it('loads the library once, on the first listing, and not before', async () => {
    const { load, provider } = makeProvider(['a', 'b']);
    expect(load).not.toHaveBeenCalled();
    await provider.list({ query: '', page: 1, pageSize: 24 });
    await provider.list({ query: 'a', page: 1, pageSize: 24 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('filters, paginates and renders only the visible page', async () => {
    const names = Array.from({ length: 60 }, (_, i) => `icon-${i}`);
    const render = vi.fn(svgFor);
    const provider = createLocalProvider({
      id: 't',
      label: 'Test',
      license: 'MIT',
      load: async () => ({ names, render }),
    });

    const page = await provider.list({ query: 'icon', page: 2, pageSize: 24 });

    expect(page).toMatchObject({ page: 2, pageCount: 3, total: 60 });
    expect(page.items.map((item) => item.name)).toEqual(names.slice(24, 48));
    expect(render).toHaveBeenCalledTimes(24);
  });

  it('sanitizes every icon it returns', async () => {
    const { provider } = makeProvider(['a']);
    const { items } = await provider.list({ query: '', page: 1, pageSize: 24 });
    expect(items[0].svg).toContain('<path');
    expect(items[0].svg).not.toMatch(/onclick/);
  });

  it('retries after a failed load', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValue({ names: ['a'], render: svgFor });
    const provider = createLocalProvider({ id: 't', label: 'Test', license: 'MIT', load });

    await expect(provider.list({ query: '', page: 1, pageSize: 24 })).rejects.toThrow('chunk failed');
    const page = await provider.list({ query: '', page: 1, pageSize: 24 });
    expect(page.total).toBe(1);
  });

  it('is not remote', () => {
    expect(makeProvider([]).provider.remote).toBe(false);
  });
});

describe('toKebabCase', () => {
  it('turns Lucide component names into icon names', () => {
    expect(toKebabCase('AArrowDown')).toBe('a-arrow-down');
    expect(toKebabCase('CloudRain')).toBe('cloud-rain');
    expect(toKebabCase('Wifi2')).toBe('wifi-2');
    expect(toKebabCase('Heart')).toBe('heart');
  });
});
