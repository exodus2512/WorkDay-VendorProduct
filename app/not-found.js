import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 max-w-md w-full">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">404</h2>
        <p className="text-sm font-semibold text-slate-700 mb-4">Page Not Found</p>
        <p className="text-xs text-slate-500 mb-6">The requested page or resource could not be found in the WorkDay portal.</p>
        <Link href="/" className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-all">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
