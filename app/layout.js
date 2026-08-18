import './globals.css';

export const metadata = {
  title: 'WorkForce - Contingent Workforce & Timesheet Tracker',
  description: 'Manage projects, timesheets, milestones, and billing for contingent workers.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 bg-slate-100">{children}</body>
    </html>
  );
}
