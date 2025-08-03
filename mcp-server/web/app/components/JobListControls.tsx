'use client';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Switch } from '@headlessui/react';

export function JobListControls() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sortFit = params.get('sort') === 'fit';

  const toggle = (enabled: boolean) => {
    const p = new URLSearchParams(params);
    if (enabled) {
      p.set('sort', 'fit');
    } else {
      p.delete('sort');
    }
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      <Switch
        checked={sortFit}
        onChange={toggle}
        className={`${
          sortFit ? 'bg-indigo-600' : 'bg-gray-200'
        } relative inline-flex h-5 w-10 items-center rounded-full transition`}
      >
        <span className="sr-only">Sort by best fit</span>
        <span
          className={`${
            sortFit ? 'translate-x-5' : 'translate-x-1'
          } inline-block h-3 w-3 transform rounded-full bg-white transition`}
        />
      </Switch>
      <span className="text-sm text-gray-700">Best fit first</span>
    </div>
  );
}