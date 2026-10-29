import { createLocalProvider } from './localProvider';
import { isRecord, toSvg } from './iconifyData';

interface PackageConfig {
  id: string;
  label: string;
  license: string;
  // Loads the `@iconify-json/*` package on demand; the package exports its set as `icons`.
  load: () => Promise<{ icons: unknown }>;
}

// A provider over an `@iconify-json/*` package (a whole icon set as one JSON file) bundled with the
// app, so it works offline and sends nothing anywhere. Adding a set is one package and one entry.
const createPackageProvider = ({ id, label, license, load }: PackageConfig) =>
  createLocalProvider({
    id,
    label,
    license,
    load: async () => {
      const { icons: set } = await load();
      if (!isRecord(set) || !isRecord(set.icons)) throw new Error(`${label} could not be loaded`);
      const icons = set.icons;
      return {
        names: Object.keys(icons).sort(),
        render: (name) => toSvg(set, icons[name]) ?? '',
      };
    },
  });

export const tablerProvider = createPackageProvider({
  id: 'tabler',
  label: 'Tabler',
  license: 'MIT',
  load: () => import('@iconify-json/tabler'),
});

export const phosphorProvider = createPackageProvider({
  id: 'phosphor',
  label: 'Phosphor',
  license: 'MIT',
  load: () => import('@iconify-json/ph'),
});
