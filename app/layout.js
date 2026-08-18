import './globals.css';

export const metadata = {
  title: 'WorkDay - Contingent Workforce & Timesheet Tracker',
  description: 'Production Hackathon MVP for Contingent Workforce, Timesheets, Milestones & Invoice Validation',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 bg-slate-100">{children}</body>
    </html>
  );
}
