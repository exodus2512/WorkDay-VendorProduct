'use client';
import React from 'react';
import { Card, Button, Badge } from '../components/UI.js';
import { Bell, CheckCircle2, AlertTriangle, Briefcase } from 'lucide-react';

export default function EmployeeNotifications({ notifications = [], empUser, onRefresh }) {
  const myNotifs = notifications.filter(n => n.user_id === empUser.id);

  const handleMarkAllRead = async () => {
    try {
      await fetch(`/api/notifications?user_id=${empUser.id}`, {
        method: 'PUT'
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notifications & Activity Feed</h2>
          <p className="text-sm text-slate-500">Real-time alerts regarding timesheet approvals, milestone status, and contract changes.</p>
        </div>
        {myNotifs.some(n => !n.read) && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mark All as Read
          </Button>
        )}
      </div>

      <Card>
        {myNotifs.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No notifications found.</p>
        ) : (
          <div className="space-y-3">
            {myNotifs.map(n => (
              <div key={n.id} className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${n.read ? 'bg-white border-slate-200' : 'bg-sky-50/70 border-sky-200 shadow-xs'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 ${n.type.includes('APPROVED') ? 'bg-emerald-100 text-emerald-700' : n.type.includes('REJECTED') ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`text-sm ${n.read ? 'text-slate-700' : 'font-bold text-slate-900'}`}>{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{new Date(n.created_at || Date.now()).toLocaleString()}</p>
                  </div>
                </div>
                {!n.read && (
                  <Badge variant="info" size="sm">NEW</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
