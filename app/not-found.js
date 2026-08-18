import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 max-w-md w-full">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">404</h2>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">The requested page or resource could not be found in the WorkForce portal.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-slate-900/20">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
