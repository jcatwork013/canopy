import { Outlet } from 'react-router-dom';

/** Padded content column for the interior app pages (not the landing hero). */
export function ContentLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Outlet />
    </div>
  );
}
