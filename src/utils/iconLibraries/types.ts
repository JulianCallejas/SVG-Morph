import type { Page } from '../iconPaging';

// An icon ready to show: `svg` is sanitized and may use currentColor; run it through
// `prepareIconSvg` before handing it to the morphing engine.
export interface IconEntry {
  name: string;
  svg: string;
}

export interface IconQuery {
  query: string;
  page: number;
  pageSize: number;
  signal?: AbortSignal;
}

export interface IconProvider {
  id: string;
  label: string;
  license: string;
  // true when browsing sends requests to a third party (only the search text and icon names)
  remote: boolean;
  list: (query: IconQuery) => Promise<Page<IconEntry>>;
}
