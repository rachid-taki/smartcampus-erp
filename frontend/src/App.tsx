import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/student/layout/Layout';
import Dashboard from './pages/StudentPortal/Dashboard/Dashboard';
import PageComingSoon from './components/student/common/PageComingSoon';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profil" element={<PageComingSoon title="Mon Profil" />} />
          <Route path="/demandes" element={<PageComingSoon title="Mes Demandes" />} />
          <Route path="/demandes/nouvelle" element={<PageComingSoon title="Nouvelle Demande" />} />
          <Route path="/documents" element={<PageComingSoon title="Documents" />} />
          <Route path="/notifications" element={<PageComingSoon title="Notifications" />} />
          <Route path="/calendrier" element={<PageComingSoon title="Calendrier" />} />
          <Route path="/historique" element={<PageComingSoon title="Historique" />} />
          <Route path="/parametres" element={<PageComingSoon title="Paramètres" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
