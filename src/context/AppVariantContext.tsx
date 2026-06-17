import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react';
import {
  getAppVariantFromPath,
  type AppVariant,
} from '../lib/appVariant';
import {
  getGardenConfig,
  type GardenConfig,
} from '../lib/garden/loadConfig';

interface AppVariantContextValue {
  variant: AppVariant;
  gardenConfig: GardenConfig;
}

const AppVariantContext = createContext<AppVariantContextValue | null>(null);

export function AppVariantProvider({ children }: { children: ReactNode }) {
  const variant = useMemo(
    () => getAppVariantFromPath(window.location.pathname),
    [],
  );
  const gardenConfig = useMemo(() => getGardenConfig(variant), [variant]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = variant;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [variant]);

  const value = useMemo(
    () => ({ variant, gardenConfig }),
    [variant, gardenConfig],
  );

  return (
    <AppVariantContext.Provider value={value}>{children}</AppVariantContext.Provider>
  );
}

export function useAppVariant(): AppVariant {
  const ctx = useContext(AppVariantContext);
  if (!ctx) {
    throw new Error('useAppVariant must be used within AppVariantProvider');
  }
  return ctx.variant;
}

export function useGardenConfig(): GardenConfig {
  const ctx = useContext(AppVariantContext);
  if (!ctx) {
    throw new Error('useGardenConfig must be used within AppVariantProvider');
  }
  return ctx.gardenConfig;
}
