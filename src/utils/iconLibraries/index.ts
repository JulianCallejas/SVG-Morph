import { iconifyProvider } from './iconify';
import { lucideProvider } from './lucide';
import type { IconProvider } from './types';

export const ICON_PROVIDERS: IconProvider[] = [lucideProvider, iconifyProvider];

export type { IconEntry, IconPage, IconProvider, IconQuery } from './types';
