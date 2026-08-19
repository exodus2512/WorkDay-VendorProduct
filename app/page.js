'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../frontend/components/Header';
import Sidebar from '../frontend/components/Sidebar';
import Login from '../frontend/auth/Login';
import LandingPage from '../frontend/LandingPage';
import { LoadingSpinner } from '../frontend/components/UI';

// Admin Views
import AdminDashboard from '../frontend/admin/Dashboard';
import AdminClients from '../frontend/admin/Clients';
import AdminProjects from '../frontend/admin/Projects';
import AdminWorkforce from '../frontend/admin/Workforce';
import AdminAssignments from '../frontend/admin/Assignments';
import AdminBilling from '../frontend/admin/Billing';
import AdminInvoices from '../frontend/admin/Invoices';

// PM Views
import PMDashboard from '../frontend/pm/Dashboard';
import PMProjects from '../frontend/pm/Projects';
import PMTeam from '../frontend/pm/Team';
import PMTimesheets from '../frontend/pm/Timesheets';
import PMMilestones from '../frontend/pm/Milestones';

// Employee Views
import EmployeeDashboard from '../frontend/employee/Dashboard';
import EmployeeAssignment from '../frontend/employee/Assignment';
import EmployeeTimesheets from '../frontend/employee/Timesheets';
import EmployeeMilestones from '../frontend/employee/Milestones';
import EmployeeNotifications from '../frontend/employee/Notifications';
import ClientPortal from '../frontend/client/Portal';
import ContractorPayrolls from '../frontend/admin/Payrolls';


export default function Home() {
  const [authToken, setAuthToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Application Data State
  const [data, setData] = useState({
    users: [],
    clients: [],
    projects: [],
    assignments: [],
    timesheets: [],
    milestones: [],
    invoices: [],
    notifications: [],
    payrolls: []
  });

  // Check auth session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        try {
          setAuthToken(storedToken);
          setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }
      setAuthChecked(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [uRes, cRes, pRes, aRes, tRes, mRes, iRes, nRes, payRes] = await Promise.all([
        fetch('/api/employees').then(r => r.json()),
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/assignments').then(r => r.json()),
        fetch('/api/timesheets').then(r => r.json()),
        fetch('/api/milestones').then(r => r.json()),
        fetch('/api/invoices').then(r => r.json()),
        fetch('/api/notifications').then(r => r.json()),
        fetch('/api/payrolls').then(r => r.json())
      ]);

      setData({
        users: Array.isArray(uRes) ? uRes : [],
        clients: Array.isArray(cRes) ? cRes : [],
        projects: Array.isArray(pRes) ? pRes : [],
        assignments: Array.isArray(aRes) ? aRes : [],
        timesheets: Array.isArray(tRes) ? tRes : [],
        milestones: Array.isArray(mRes) ? mRes : [],
        invoices: Array.isArray(iRes) ? iRes : [],
        notifications: Array.isArray(nRes) ? nRes : [],
        payrolls: Array.isArray(payRes) ? payRes : []
      });
    } catch (err) {
      console.error('Error fetching application state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authToken && currentUser) {
      fetchData();
    }
  }, [authToken, currentUser, fetchData]);

  const handleLoginSuccess = (token, user) => {
    setAuthToken(token);
    setCurrentUser(user);
    setActiveSection('dashboard');
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    setAuthToken(null);
    setCurrentUser(null);
    setActiveSection('dashboard');
  };

  if (!authChecked) {
    return <LoadingSpinner text="Checking authentication..." />;
  }

  // Render Landing page or Login if not authenticated
  if (!authToken || !currentUser) {
    if (showLogin) {
      return (
        <div className="relative min-h-screen bg-slate-50 flex flex-col">
          <div className="absolute top-6 left-6 z-10">
            <button onClick={() => setShowLogin(false)} className="text-slate-500 hover:text-slate-900 font-medium text-sm flex items-center gap-2 transition-colors">
              ← Back to Home
            </button>
          </div>
          <Login onLoginSuccess={handleLoginSuccess} />
        </div>
      );
    }
    return <LandingPage onLoginClick={() => setShowLogin(true)} onSignupSuccess={handleLoginSuccess} />;
  }

  const currentRole = currentUser.role;
  const pms = data.users.filter(u => u.role === 'PROJECT_MANAGER');
  const contractors = data.users.filter(u => u.role === 'EMPLOYEE');
  const unreadNotifsCount = data.notifications.filter(n => n.user_id === currentUser.id && !n.read).length;

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentRole={currentRole}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          notificationsCount={unreadNotifsCount}
          onRefresh={fetchData}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl w-full mx-auto animate-slide-up">
          {loading ? (
            <LoadingSpinner text="Loading workspace data..." />
          ) : (
            <>
              {/* VENDOR ADMIN SCREENS */}
              {currentRole === 'VENDOR_ADMIN' && (
                <>
                  {activeSection === 'dashboard' && (
                    <AdminDashboard data={data} onNavigate={setActiveSection} onRefresh={fetchData} />
                  )}
                  {activeSection === 'clients' && (
                    <AdminClients clients={data.clients} projects={data.projects} onRefresh={fetchData} onNavigate={setActiveSection} />
                  )}
                  {activeSection === 'projects' && (
                    <AdminProjects projects={data.projects} clients={data.clients} pms={pms} milestones={data.milestones} assignments={data.assignments} onRefresh={fetchData} />
                  )}
                  {activeSection === 'workforce' && (
                    <AdminWorkforce users={data.users} assignments={data.assignments} onRefresh={fetchData} />
                  )}
                  {activeSection === 'assignments' && (
                    <AdminAssignments assignments={data.assignments} projects={data.projects} contractors={contractors} onRefresh={fetchData} />
                  )}
                  {activeSection === 'billing' && (
                    <AdminBilling timesheets={data.timesheets} milestones={data.milestones} projects={data.projects} assignments={data.assignments} contractors={contractors} onNavigate={setActiveSection} onRefresh={fetchData} />
                  )}
                  {activeSection === 'invoices' && (
                    <AdminInvoices invoices={data.invoices} onRefresh={fetchData} />
                  )}
                  {activeSection === 'payrolls' && (
                    <ContractorPayrolls payrolls={data.payrolls} />
                  )}
                </>
              )}

              {/* PROJECT MANAGER SCREENS */}
              {currentRole === 'PROJECT_MANAGER' && (
                <>
                  {activeSection === 'dashboard' && (
                    <PMDashboard data={data} pmUser={currentUser} onNavigate={setActiveSection} onRefresh={fetchData} />
                  )}
                  {activeSection === 'projects' && (
                    <PMProjects projects={data.projects} pmUser={currentUser} assignments={data.assignments} milestones={data.milestones} onRefresh={fetchData} />
                  )}
                  {activeSection === 'team' && (
                    <PMTeam projects={data.projects} pmUser={currentUser} assignments={data.assignments} users={data.users} onRefresh={fetchData} />
                  )}
                  {activeSection === 'timesheets' && (
                    <PMTimesheets
                      timesheets={data.timesheets.filter(t => {
                        const currentPmIdStr = String(currentUser?.id || '');
                        if (t.pm_id && String(t.pm_id) === currentPmIdStr) return true;
                        const project = data.projects.find(p => String(p.id) === String(t.project_id));
                        if (project) {
                          if (String(project.project_manager_id) === currentPmIdStr) return true;
                          if (currentUser?.client_id && Number(project.client_id) === Number(currentUser.client_id)) return true;
                          if (currentUser?.vendor_id && Number(project.vendor_id) === Number(currentUser.vendor_id)) return true;
                        }
                        return true;
                      })}
                      assignments={data.assignments}
                      onRefresh={fetchData}
                    />
                  )}
                  {activeSection === 'milestones' && (
                    <PMMilestones
                      milestones={data.milestones.filter(m => {
                        const currentPmIdStr = String(currentUser?.id || '');
                        if (m.pm_id && String(m.pm_id) === currentPmIdStr) return true;
                        const project = data.projects.find(p => String(p.id) === String(m.project_id));
                        if (project) {
                          if (String(project.project_manager_id) === currentPmIdStr) return true;
                          if (currentUser?.client_id && Number(project.client_id) === Number(currentUser.client_id)) return true;
                          if (currentUser?.vendor_id && Number(project.vendor_id) === Number(currentUser.vendor_id)) return true;
                        }
                        return true;
                      })}
                      projects={data.projects}
                      onRefresh={fetchData}
                    />
                  )}
                  {activeSection === 'payrolls' && (
                    <ContractorPayrolls payrolls={(data.payrolls || []).filter(p => {
                      const currentPmIdStr = String(currentUser?.id || '');
                      const project = data.projects.find(proj => proj.id === p.project_id);
                      if (project) {
                        if (String(project.project_manager_id) === currentPmIdStr) return true;
                        if (currentUser?.client_id && Number(project.client_id) === Number(currentUser.client_id)) return true;
                        if (currentUser?.vendor_id && Number(project.vendor_id) === Number(currentUser.vendor_id)) return true;
                      }
                      return true;
                    })} />
                  )}
                </>
              )}

              {/* EMPLOYEE / CONTRACTOR SCREENS */}
              {currentRole === 'EMPLOYEE' && (
                <>
                  {activeSection === 'dashboard' && (
                    <EmployeeDashboard data={data} empUser={currentUser} onNavigate={setActiveSection} onRefresh={fetchData} />
                  )}
                  {activeSection === 'assignment' && (
                    <EmployeeAssignment assignments={data.assignments} empUser={currentUser} onRefresh={fetchData} />
                  )}
                  {activeSection === 'timesheets' && (
                    <EmployeeTimesheets timesheets={data.timesheets.filter(t => t.employee_id === currentUser.id)} assignments={data.assignments.filter(a => a.employee_id === currentUser.id)} milestones={data.milestones || []} empUser={currentUser} onRefresh={fetchData} />
                  )}
                  {activeSection === 'milestones' && (
                    <EmployeeMilestones 
                      milestones={data.milestones.filter(m => data.assignments.some(a => a.employee_id === currentUser.id && String(a.project_id) === String(m.project_id)))} 
                      assignments={data.assignments.filter(a => a.employee_id === currentUser.id)} 
                      empUser={currentUser} 
                      onRefresh={fetchData} 
                    />
                  )}
                  {activeSection === 'payrolls' && (
                    <ContractorPayrolls payrolls={(data.payrolls || []).filter(p => p.employee_id === currentUser.id)} />
                  )}
                  {activeSection === 'notifications' && (
                    <EmployeeNotifications notifications={data.notifications} empUser={currentUser} onRefresh={fetchData} />
                  )}
                </>
              )}

              {/* CLIENT PORTAL */}
              {currentRole === 'CLIENT' && (
                <ClientPortal clientUser={currentUser} onRefresh={fetchData} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
