import type { ComponentType } from 'react';
import { createLocalProvider } from './localProvider';

// "AArrowDown" -> "a-arrow-down", "Wifi2" -> "wifi-2"
export const toKebabCase = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();

export const lucideProvider = createLocalProvider({
  id: 'lucide',
  label: 'Lucide',
  license: 'ISC',
  load: async () => {
    const [{ icons }, { renderToStaticMarkup }, { createElement }] = await Promise.all([
      import('lucide-react'),
      import('react-dom/server'),
      import('react'),
    ]);
    const components = new Map(
      Object.entries(icons).map(([key, component]) => [toKebabCase(key), component as ComponentType<{ size: number }>]),
    );
    return {
      names: [...components.keys()].sort(),
      render: (name) => renderToStaticMarkup(createElement(components.get(name)!, { size: 24 })),
    };
  },
});
