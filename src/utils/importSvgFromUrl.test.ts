// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importSvgFromUrl, MAX_SVG_BYTES } from './importSvgFromUrl';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0 L24 24"/></svg>';

const respond = (body: string, init: ResponseInit = {}) =>
  vi.fn().mockResolvedValue(new Response(body, { status: 200, ...init }));

describe('importSvgFromUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns the SVG text of an https URL', async () => {
    const fetchMock = respond(SVG);
    vi.stubGlobal('fetch', fetchMock);

    const content = await importSvgFromUrl('https://example.com/icon.svg');

    expect(content).toContain('<path');
    expect(content).toContain('viewBox="0 0 24 24"');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.com/icon.svg');
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
  });

  it('rejects anything that is not https, without calling fetch', async () => {
    const fetchMock = respond(SVG);
    vi.stubGlobal('fetch', fetchMock);

    for (const url of ['http://example.com/a.svg', 'javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'ftp://x/a.svg', 'not a url', '']) {
      await expect(importSvgFromUrl(url)).rejects.toThrow(/https/i);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a failed HTTP status', async () => {
    vi.stubGlobal('fetch', respond('nope', { status: 404 }));
    await expect(importSvgFromUrl('https://example.com/missing.svg')).rejects.toThrow(/404/);
  });

  it('explains a network or CORS failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(importSvgFromUrl('https://example.com/a.svg')).rejects.toThrow(/CORS|reach/i);
  });

  it('gives up after the timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
      ),
    );

    const result = importSvgFromUrl('https://example.com/slow.svg', { timeoutMs: 1000 });
    const assertion = expect(result).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('rejects a file bigger than the cap, by header and by actual size', async () => {
    vi.stubGlobal('fetch', respond(SVG, { headers: { 'content-length': String(MAX_SVG_BYTES + 1) } }));
    await expect(importSvgFromUrl('https://example.com/big.svg')).rejects.toThrow(/too large/i);

    vi.stubGlobal('fetch', respond(`<svg xmlns="http://www.w3.org/2000/svg">${'x'.repeat(MAX_SVG_BYTES)}</svg>`));
    await expect(importSvgFromUrl('https://example.com/lying.svg')).rejects.toThrow(/too large/i);
  });

  it('rejects content that is not an SVG', async () => {
    vi.stubGlobal('fetch', respond('<html><body>hello</body></html>'));
    await expect(importSvgFromUrl('https://example.com/page')).rejects.toThrow(/valid SVG/i);

    vi.stubGlobal('fetch', respond('<svg><path'));
    await expect(importSvgFromUrl('https://example.com/broken.svg')).rejects.toThrow(/valid SVG/i);
  });

  it('strips scripts and event handlers before handing the SVG over', async () => {
    vi.stubGlobal(
      'fetch',
      respond(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)"><script>alert(2)</script><path d="M0 0 L24 24" onclick="alert(3)"/></svg>',
      ),
    );

    const content = await importSvgFromUrl('https://example.com/evil.svg');

    expect(content).not.toMatch(/script|onload|onclick|alert/i);
    expect(content).toContain('<path');
  });
});
