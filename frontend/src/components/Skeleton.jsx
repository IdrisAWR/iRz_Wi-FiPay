export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />;
}

// Baris tabel: satu sel selebar tabel agar tampil sama di desktop dan kartu mobile.
export function RowsSkeleton({ colSpan, rows = 5, label = 'Memuat data' }) {
  return Array.from({ length: rows }, (_, i) => (
    <tr key={i}>
      <td colSpan={colSpan} className="p-4">
        {i === 0 && <span role="status" className="sr-only">{label}</span>}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20 hidden sm:block" />
          <Skeleton className="h-6 w-24" />
        </div>
      </td>
    </tr>
  ));
}

export function CardsSkeleton({ count = 4, label = 'Memuat data' }) {
  return (
    <div role="status" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ label = 'Memuat halaman' }) {
  return (
    <div role="status" className="space-y-6 max-w-5xl">
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <CardsSkeleton />
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6 space-y-4">
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="h-48 md:h-64 w-full" />
      </div>
    </div>
  );
}
