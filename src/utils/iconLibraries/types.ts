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
  // which of the provider's `sets` to browse; the first one when omitted
  set?: string;
  signal?: AbortSignal;
}

// `license` is set when it depends on what was browsed (an Iconify set); otherwise the provider's applies
export type IconPage = Page<IconEntry> & { license?: string };

export interface IconProvider {
  id: string;
  label: string;
  license: string;
  // true when browsing sends requests to a third party (only the search text and icon names)
  remote: boolean;
  sets?: { id: string; label: string }[];
  list: (query: IconQuery) => Promise<IconPage>;
}
