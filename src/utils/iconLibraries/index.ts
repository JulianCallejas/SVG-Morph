import { iconifyProvider } from './iconify';
import { phosphorProvider, tablerProvider } from './iconifyPackages';
import { lucideProvider } from './lucide';
import type { IconProvider } from './types';

// Bundled sets first (offline, loaded on demand), the online catalog last
export const ICON_PROVIDERS: IconProvider[] = [lucideProvider, tablerProvider, phosphorProvider, iconifyProvider];

export type { IconEntry, IconPage, IconProvider, IconQuery } from './types';
