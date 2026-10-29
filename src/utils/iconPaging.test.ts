import { describe, expect, it } from 'vitest';
import { PAGE_SIZES, filterNames, paginate } from './iconPaging';

describe('filterNames', () => {
  const names = ['arrow-up', 'arrow-down-left', 'cloud', 'cloud-rain', 'user'];

  it('returns everything for an empty or blank query', () => {
    expect(filterNames(names, '')).toEqual(names);
    expect(filterNames(names, '   ')).toEqual(names);
  });

  it('matches a substring, ignoring case', () => {
    expect(filterNames(names, 'CLOUD')).toEqual(['cloud', 'cloud-rain']);
  });

  it('needs every word of the query to match, in any order', () => {
    expect(filterNames(names, 'down arrow')).toEqual(['arrow-down-left']);
    expect(filterNames(names, 'arrow cloud')).toEqual([]);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 100 }, (_, i) => i);

  it('slices one page and reports the totals', () => {
    const page = paginate(items, 2, 48);
    expect(page.items).toEqual(items.slice(48, 96));
    expect(page).toMatchObject({ page: 2, pageCount: 3, total: 100 });
    expect(paginate(items, 3, 48).items).toEqual(items.slice(96));
  });

  it('clamps an out-of-range page into range', () => {
    expect(paginate(items, 99, 48).page).toBe(3);
    expect(paginate(items, 0, 48).page).toBe(1);
    expect(paginate(items, -4, 48).page).toBe(1);
  });

  it('handles no results: one empty page', () => {
    expect(paginate([], 1, 48)).toEqual({ items: [], page: 1, pageCount: 1, total: 0 });
  });

  it('offers the agreed page sizes, 48 being the default', () => {
    expect(PAGE_SIZES).toEqual([24, 48, 96]);
  });
});
