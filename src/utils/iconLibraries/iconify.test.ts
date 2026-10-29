// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const COLLECTION = {
  prefix: 'demo',
  info: { license: { title: 'MIT' } },
  uncategorized: ['home', 'cloud-rain'],
  categories: { Weather: ['cloud-rain', 'sun'], Arrows: ['arrow-up'] },
};
const BATCH = {
  prefix: 'lucide',
  width: 24,
  height: 24,
  icons: {
    'arrow-up': { body: '<path d="M0 0 L24 24" onclick="x()"/>' },
    'cloud-rain': { body: '<path d="M1 1 L2 2"/>', width: 32, height: 32, left: 2, top: 3 },
    home: { body: 42 },
  },
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

const stubFetch = () => {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => (url.includes('/collection') ? json(COLLECTION) : json(BATCH)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

// a fresh module each time, because the provider caches the name lists
const load = async () => (await import('./iconify')).iconifyProvider;

const ask = { query: '', page: 1, pageSize: 24, set: 'lucide' };

describe('iconifyProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('is remote and offers sets to browse', async () => {
    const provider = await load();
    expect(provider.remote).toBe(true);
    expect(provider.sets?.map((set) => set.id)).toEqual(expect.arrayContaining(['lucide', 'tabler', 'ph']));
  });

  it('lists a set: every name once, sorted, with the set license, and fetches only the page in ONE request', async () => {
    const fetchMock = stubFetch();
    const provider = await load();

    const page = await provider.list(ask);

    expect(page).toMatchObject({ total: 4, page: 1, pageCount: 1, license: 'MIT' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.iconify.design/collection?prefix=lucide&info=true');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.iconify.design/lucide.json?icons=arrow-up,cloud-rain,home,sun');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
  });

  it('builds standalone SVGs: set size by default, own size and offset when the icon has them, no bad icons', async () => {
    stubFetch();
    const provider = await load();

    const { items } = await provider.list(ask);

    // "home" had no usable body and "sun" was not answered
    expect(items.map((item) => item.name)).toEqual(['arrow-up', 'cloud-rain']);
    expect(items[0].svg).toContain('viewBox="0 0 24 24"');
    expect(items[1].svg).toContain('viewBox="2 3 32 32"');
  });

  it('sanitizes what the server sends', async () => {
    stubFetch();
    const provider = await load();
    const { items } = await provider.list(ask);
    expect(items[0].svg).not.toMatch(/onclick/);
  });

  it('searches in memory and asks for the icons of the matching page only', async () => {
    const fetchMock = stubFetch();
    const provider = await load();

    await provider.list({ ...ask, query: 'cloud' });

    expect(fetchMock.mock.calls[1][0]).toBe('https://api.iconify.design/lucide.json?icons=cloud-rain');
  });

  it('does not ask for icons when nothing matches', async () => {
    const fetchMock = stubFetch();
    const provider = await load();

    const page = await provider.list({ ...ask, query: 'zzz' });

    expect(page.total).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks for the name list of a set once', async () => {
    const fetchMock = stubFetch();
    const provider = await load();

    await provider.list(ask);
    await provider.list({ ...ask, query: 'sun' });

    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/collection'))).toHaveLength(1);
  });

  it('refuses a set that is not in the list, without any request', async () => {
    const fetchMock = stubFetch();
    const provider = await load();
    await expect(provider.list({ ...ask, set: '../evil' })).rejects.toThrow(/unknown icon set/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains a server error and a network failure, and retries a failed name list', async () => {
    const provider = await load();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 503)));
    await expect(provider.list(ask)).rejects.toThrow(/503/);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(provider.list(ask)).rejects.toThrow(/reach Iconify/);

    stubFetch();
    await expect(provider.list(ask)).resolves.toMatchObject({ total: 4 });
  });

  it('rejects an answer that is not what the API documents', async () => {
    const provider = await load();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(['nope'])));
    await expect(provider.list(ask)).rejects.toThrow(/unexpected/i);
  });

  it('passes the caller abort through, so a stale search stops', async () => {
    const provider = await load();
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      ),
    );

    const result = provider.list({ ...ask, signal: controller.signal });
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
