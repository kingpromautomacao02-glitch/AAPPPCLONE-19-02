import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { EyeOff } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { User } from './types';
import { setCurrentUser } from './services/storageService';

// Components
import { Dashboard } from './components/Dashboard';
import { ClientDetails } from './components/ClientDetails';
import { Expenses } from './components/Expenses';
import { Reports } from './components/Reports';
import { NewOrder } from './components/NewOrder';
import { Auth } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ClientList } from './components/ClientList';

// --- Main App Content (uses contexts) ---
function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const { clients, services, expenses, refreshData, loading: dataLoading } = useData();

  // State for impersonation
  const [realAdminUser, setRealAdminUser] = React.useState<User | null>(null);
  const [displayUser, setDisplayUser] = React.useState<User | null>(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Apply Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Sync displayUser with auth user
  useEffect(() => {
    if (user && !realAdminUser) {
      setDisplayUser(user);
      setCurrentUser(user); // Keep localStorage in sync for storageService
    }
  }, [user, realAdminUser]);

  // Refresh data when user changes
  useEffect(() => {
    if (displayUser) {
      refreshData();
    }
  }, [displayUser, refreshData]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleLogout = async () => {
    await logout();
    setRealAdminUser(null);
    setDisplayUser(null);
  };

  // Impersonation Logic
  const startImpersonation = (targetUser: User) => {
    if (displayUser?.role !== 'ADMIN') return;
    setRealAdminUser(displayUser);
    setDisplayUser(targetUser);
    setCurrentUser(targetUser); // Update localStorage for storageService
  };

  const stopImpersonation = () => {
    if (realAdminUser) {
      setDisplayUser(realAdminUser);
      setCurrentUser(realAdminUser);
      setRealAdminUser(null);
    }
  };

  // Wrapper for Client Details
  const ClientDetailsWrapper = () => {
    const { id } = useParams();
    const client = clients.find(c => c.id === id);
    const navigate = useNavigate();

    if (!client) {
      return <div>Cliente não encontrado</div>;
    }

    return <ClientDetails currentUser={displayUser!} client={client} onBack={() => navigate('/clients')} />;
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Carregando...</div>
      </div>
    );
  }

  // If not logged in, show Auth screen
  if (!user || !displayUser) {
    return (
      <>
        <Toaster position="top-right" />
        <Auth />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 md:h-screen md:overflow-hidden">
      <Toaster position="top-right" richColors />

      {/* Impersonation Warning Banner */}
      {realAdminUser && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-xs font-bold py-1 px-4 z-50 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <EyeOff size={14} />
            <span>VOCÊ ESTÁ ACESSANDO COMO: {displayUser.name.toUpperCase()}</span>
          </div>
          <button
            onClick={stopImpersonation}
            className="bg-white text-orange-600 px-3 py-0.5 rounded-full text-[10px] hover:bg-orange-100 transition-colors"
          >
            SAIR DO MODO DE ACESSO
          </button>
        </div>
      )}

      <Sidebar
        currentUser={displayUser}
        realAdminUser={realAdminUser}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto h-screen md:h-full pb-24 md:pb-0 bg-slate-50 dark:bg-slate-900 ${realAdminUser ? 'pt-8 md:pt-0' : ''}`}>

        <Header
          currentUser={displayUser}
          realAdminUser={realAdminUser}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onLogout={handleLogout}
        />

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard clients={clients} services={services} expenses={expenses} />} />
            <Route path="/clients" element={<ClientList clients={clients} services={services} currentUser={displayUser} onRefresh={refreshData} />} />
            <Route path="/clients/:id" element={<ClientDetailsWrapper />} />
            <Route path="/orders/new" element={<NewOrder currentUser={displayUser} />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports clients={clients} services={services} currentUser={displayUser} onRefresh={refreshData} />} />
            <Route path="/settings" element={<Settings currentUser={displayUser} onUpdateUser={setDisplayUser} />} />

            <Route path="/admin" element={
              displayUser.role === 'ADMIN'
                ? <AdminPanel currentAdmin={displayUser} onImpersonate={startImpersonation} />
                : <Navigate to="/" />
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

// --- Root App with Providers ---
function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
