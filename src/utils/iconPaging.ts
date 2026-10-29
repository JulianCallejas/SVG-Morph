export const PAGE_SIZES = [24, 48, 96] as const;
export const DEFAULT_PAGE_SIZE = 48;

// Every word of the query has to appear in the name, in any order: "down arrow" finds "arrow-down".
export const filterNames = (names: string[], query: string): string[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return names;
  return names.filter((name) => {
    const lower = name.toLowerCase();
    return words.every((word) => lower.includes(word));
  });
};

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

// 1-based page; an out-of-range page is clamped, and no results is one empty page.
export const paginate = <T>(items: T[], page: number, pageSize: number): Page<T> => {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, pageCount, total: items.length };
};
