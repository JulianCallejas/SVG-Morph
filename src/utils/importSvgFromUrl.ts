import { sanitizeSVG } from './sanitizeSVG';

export const MAX_SVG_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;

interface ImportOptions {
  timeoutMs?: number;
}

const parseHttpsUrl = (input: string): URL => {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Enter a valid https URL');
  }
  if (url.protocol !== 'https:') throw new Error('Only https URLs are allowed');
  return url;
};

const isSvgDocument = (text: string): boolean => {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  return !doc.querySelector('parsererror') && doc.documentElement.tagName.toLowerCase() === 'svg';
};

// Downloads an SVG from an https URL and returns it sanitized. It runs in the browser, so the host
// has to allow cross-origin reads (CORS); no cookies or referrer are sent, and the size and the
// wait are capped. The text is untrusted: scripts and event handlers are stripped before it is returned.
export const importSvgFromUrl = async (input: string, options: ImportOptions = {}): Promise<string> => {
  const url = parseHttpsUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('The request timed out');
      }
      throw new Error('Could not reach that URL. The host may not allow cross-origin downloads (CORS).');
    }

    if (!response.ok) throw new Error(`The server answered ${response.status}`);

    const declared = Number(response.headers.get('content-length'));
    if (declared > MAX_SVG_BYTES) throw new Error('The file is too large');

    const text = await response.text();
    if (new TextEncoder().encode(text).length > MAX_SVG_BYTES) throw new Error('The file is too large');
    if (!isSvgDocument(text)) throw new Error('The URL did not return a valid SVG');

    const safe = sanitizeSVG(text);
    if (!safe) throw new Error('The URL did not return a valid SVG');
    return safe;
  } finally {
    clearTimeout(timer);
  }
};
