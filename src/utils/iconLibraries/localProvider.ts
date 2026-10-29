import { filterNames, paginate } from '../iconPaging';
import { sanitizeSVG } from '../sanitizeSVG';
import type { IconProvider } from './types';

interface LocalLibrary {
  names: string[];
  render: (name: string) => string;
}

interface LocalProviderConfig {
  id: string;
  label: string;
  license: string;
  // Loads the icon package on demand; called once, on the first listing.
  load: () => Promise<LocalLibrary>;
}

// A provider over an icon package bundled with the app: searching and paging happen in memory,
// and only the icons of the visible page are rendered.
export const createLocalProvider = ({ id, label, license, load }: LocalProviderConfig): IconProvider => {
  let library: Promise<LocalLibrary> | null = null;

  return {
    id,
    label,
    license,
    remote: false,
    list: async ({ query, page, pageSize }) => {
      library ??= load().catch((error) => {
        library = null; // a failed load can be retried
        throw error;
      });
      const { names, render } = await library;
      const result = paginate(filterNames(names, query), page, pageSize);
      return {
        ...result,
        items: result.items.map((name) => ({ name, svg: sanitizeSVG(render(name)) })),
      };
    },
  };
};
