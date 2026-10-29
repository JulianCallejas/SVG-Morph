import { filterNames, paginate } from '../iconPaging';
import { isRecord, toSvg } from './iconifyData';
import type { IconProvider } from './types';

const API = 'https://api.iconify.design';
const TIMEOUT_MS = 10_000;
const MAX_RESPONSE_CHARS = 4 * 1024 * 1024;

// A few free, permissively licensed sets; the prefix is the Iconify id of the set.
export const ICONIFY_SETS = [
  { id: 'lucide', label: 'Lucide' },
  { id: 'tabler', label: 'Tabler' },
  { id: 'ph', label: 'Phosphor' },
  { id: 'heroicons', label: 'Heroicons' },
  { id: 'bi', label: 'Bootstrap Icons' },
  { id: 'mdi', label: 'Material Design Icons' },
  { id: 'material-symbols', label: 'Material Symbols' },
  { id: 'ri', label: 'Remix Icon' },
];

// GET + JSON with a timeout that also follows the caller's signal. Nothing identifying is sent.
const getJson = async (url: string, signal?: AbortSignal): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const forward = () => controller.abort();
  signal?.addEventListener('abort', forward);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`Iconify answered ${response.status}`);
    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) throw new Error('Iconify sent too much data');
    return JSON.parse(text);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Iconify took too long to answer');
    if (error instanceof TypeError) throw new Error('Could not reach Iconify. Check your connection.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forward);
  }
};

interface SetListing {
  names: string[];
  license?: string;
}

const readListing = (data: unknown): SetListing => {
  if (!isRecord(data)) throw new Error('Iconify sent an unexpected answer');
  const names = new Set<string>();
  const add = (list: unknown) => {
    if (Array.isArray(list)) list.forEach((name) => typeof name === 'string' && names.add(name));
  };
  add(data.uncategorized);
  if (isRecord(data.categories)) Object.values(data.categories).forEach(add);
  const info = data.info;
  const license =
    isRecord(info) && isRecord(info.license) && typeof info.license.title === 'string' ? info.license.title : undefined;
  return { names: [...names].sort(), license };
};

// Iconify (api.iconify.design): the names of a set come in one request and are searched and paged
// in memory; each page costs one more request for just the icons on it.
export const iconifyProvider: IconProvider = (() => {
  const listings = new Map<string, Promise<SetListing>>();

  const listing = (set: string, signal?: AbortSignal): Promise<SetListing> => {
    let cached = listings.get(set);
    if (!cached) {
      cached = getJson(`${API}/collection?prefix=${encodeURIComponent(set)}&info=true`, signal).then(readListing);
      cached.catch(() => listings.delete(set)); // a failed request can be retried
      listings.set(set, cached);
    }
    return cached;
  };

  return {
    id: 'iconify',
    label: 'Iconify (online)',
    license: 'varies by set',
    remote: true,
    sets: ICONIFY_SETS,
    list: async ({ query, page, pageSize, set = ICONIFY_SETS[0].id, signal }) => {
      if (!ICONIFY_SETS.some((known) => known.id === set)) throw new Error('Unknown icon set');

      const { names, license } = await listing(set, signal);
      const result = paginate(filterNames(names, query), page, pageSize);
      if (result.items.length === 0) return { ...result, items: [], license };

      const batch = await getJson(`${API}/${encodeURIComponent(set)}.json?icons=${result.items.join(',')}`, signal);
      if (!isRecord(batch) || !isRecord(batch.icons)) throw new Error('Iconify sent an unexpected answer');
      const icons = batch.icons;

      const items = result.items.flatMap((name) => {
        const svg = toSvg(batch, icons[name]);
        return svg ? [{ name, svg }] : [];
      });
      return { ...result, items, license };
    },
  };
})();
