'use client';
export default function Pagination({
  page,
  nbPages,
  onPage,
}: {
  page: number;
  nbPages: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex gap-2 items-center mt-4">
      <button
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1 border rounded disabled:opacity-40 text-gray-900"
      >
        ‹ Prev
      </button>
      <span className="text-sm text-gray-900">
        Page {page + 1} / {nbPages}
      </span>
      <button
        disabled={page + 1 >= nbPages}
        onClick={() => onPage(page + 1)}
        className="px-3 py-1 border rounded disabled:opacity-40 text-gray-900"
      >
        Next ›
      </button>
    </div>
  );
}
