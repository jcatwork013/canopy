import { Leaf } from '@/components/icons';

/** Full-screen brand splash shown while the readiness check is in flight. */
export function SplashScreen() {
  return (
    <div className="app-frame flex flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md">
        <Leaf className="h-10 w-10" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Canopy</h1>
        <p className="text-sm text-content-secondary">Chăm cây cùng AI</p>
      </div>
      <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-subtle">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-500" />
      </div>
    </div>
  );
}
