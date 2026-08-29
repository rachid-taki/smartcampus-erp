import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Ban,
  Search,
  Building2,
  Filter
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

interface Salle {
  id_salle: string;
  numero: string;
  nom: string | null;
  capacite: number;
  type: string;
}

interface Reservation {
  id_reservation: string;
  id_salle: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  motif: string | null;
  statut: 'Demandee' | 'Approuvee' | 'Rejetee' | 'Annulee';
  salle?: {
    numero: string;
    nom: string | null;
    type: string;
  };
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const API_BASE = 'http://localhost:3000/api/enseignant/salles-reservations';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  if (timeStr.includes('T')) {
    return timeStr.substring(11, 16);
  }
  return timeStr.substring(0, 5);
};

// ─────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────

function StatusBadge({ statut }: { statut: Reservation['statut'] }) {
  const styles = {
    Demandee: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    Approuvee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
    Rejetee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
    Annulee: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${styles[statut]}`}>
      {statut}
    </span>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void; }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div key={toast.id} className={`flex items-start gap-3 rounded-lg shadow-lg border p-4 animate-fade-in ${toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'}`}>
          {toast.type === 'success' ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"><CheckCircle className="h-4 w-4" /></div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"><AlertTriangle className="h-4 w-4" /></div>
          )}
          <p className="text-sm flex-1">{toast.message}</p>
          <button onClick={() => onDismiss(toast.id)} className="text-current opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────────────────────

function CreateReservationModal({ onClose, onCreated, pushToast }: { onClose: () => void; onCreated: () => Promise<void>; pushToast: (type: Toast['type'], message: string) => void; }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [date, setDate] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [sallesDisponibles, setSallesDisponibles] = useState<Salle[]>([]);
  const [selectedSalleId, setSelectedSalleId] = useState<string>('');
  const [motif, setMotif] = useState('');

  const searchSalles = async () => {
    setFormError(null);
    if (!date || !heureDebut || !heureFin) return setFormError('Veuillez remplir la date et les heures.');
    if (heureFin <= heureDebut) return setFormError("L'heure de fin doit être après l'heure de début.");

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const query = new URLSearchParams({ date, heure_debut: heureDebut, heure_fin: heureFin });
      const res = await fetch(`${API_BASE}/salles/disponibles?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) throw new Error(json.message);
      
      setSallesDisponibles(json.data || []);
      if (json.data.length === 0) setFormError('Aucune salle disponible pour ce créneau.');
      else setStep(2);
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la recherche des salles.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSalleId) return setFormError('Veuillez sélectionner une salle.');
    setFormError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          id_salle: selectedSalleId,
          date,
          heure_debut: heureDebut,
          heure_fin: heureFin,
          motif
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      pushToast('success', 'Demande de réservation envoyée.');
      await onCreated();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la réservation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !loading && onClose()}>
      <div className="card w-full max-w-lg shadow-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-900/20">
          <div>
            <h2 className="text-lg font-bold text-indigo-800 dark:text-indigo-400">Réserver une salle</h2>
            <p className="text-sm text-indigo-600 dark:text-indigo-500 mt-0.5">Étape {step} sur 2</p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6">
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {formError}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Heure de début</label>
                  <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Heure de fin</label>
                  <input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <button onClick={searchSalles} disabled={loading} className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-2.5 shadow-sm transition-all disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Chercher les salles
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Choisir une salle ({sallesDisponibles.length})</label>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {sallesDisponibles.map(salle => (
                    <div 
                      key={salle.id_salle}
                      onClick={() => setSelectedSalleId(salle.id_salle)}
                      className={`cursor-pointer p-3 border rounded-xl transition-all ${
                        selectedSalleId === salle.id_salle 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm ring-1 ring-indigo-500' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-500" /> {salle.numero}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{salle.nom || salle.type}</p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">{salle.capacite} places</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Motif (Obligatoire)</label>
                <textarea 
                  value={motif} 
                  onChange={e => setMotif(e.target.value)} 
                  rows={2} 
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  placeholder="Ex: Séance de rattrapage, Examen..."
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} disabled={loading} className="w-1/3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Retour</button>
                <button onClick={handleSubmit} disabled={loading || !selectedSalleId} className="w-2/3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-2.5 shadow-sm transition-all disabled:opacity-50">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CancelReservationModal({ reservation, onClose, onSaved, pushToast }: { reservation: Reservation; onClose: () => void; onSaved: () => void; pushToast: (type: Toast['type'], message: string) => void; }) {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/${reservation.id_reservation}/annuler`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      
      pushToast('success', 'Réservation annulée avec succès.');
      onSaved();
      onClose();
    } catch (err: any) {
      pushToast('error', err.message || "Erreur lors de l'annulation.");
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !cancelling && onClose()}>
      <div className="card w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex flex-col p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <Ban className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Annuler la réservation ?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Voulez-vous vraiment annuler votre réservation pour la salle <strong>{reservation.salle?.numero}</strong> le {formatDateFr(reservation.date)} ?
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={cancelling} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors">Retour</button>
          <button onClick={handleCancel} disabled={cancelling} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function ReservationEnseignant() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);

  const [activeTab, setActiveTab] = useState<'Toutes' | 'En attente' | 'Approuvées' | 'Historique'>('Toutes');
  const [searchInput, setSearchInput] = useState('');

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      setReservations(json.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos réservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Filtrage combiné (Recherche + Onglets)
  const filteredReservations = reservations.filter((r) => {
    const salleNom = r.salle?.nom || '';
    const salleNumero = r.salle?.numero || '';
    const motif = r.motif || '';
    
    const searchTarget = `${salleNom} ${salleNumero} ${motif}`.toLowerCase();
    const matchesSearch = !searchInput.trim() || searchTarget.includes(searchInput.trim().toLowerCase());

    let matchesTab = true;
    if (activeTab === 'En attente') matchesTab = r.statut === 'Demandee';
    else if (activeTab === 'Approuvées') matchesTab = r.statut === 'Approuvee';
    else if (activeTab === 'Historique') matchesTab = ['Rejetee', 'Annulee'].includes(r.statut);

    return matchesSearch && matchesTab;
  });

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                Réservations de Salles
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Gérez vos demandes de salles pour vos rattrapages et examens.
              </p>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-2 whitespace-nowrap">
            <Plus className="h-5 w-5" />
            Nouvelle Réservation
          </button>
        </header>

        {/* Système d'onglets */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar pt-2">
          {(['Toutes', 'En attente', 'Approuvées', 'Historique'] as const).map(tab => {
            const count = reservations.filter(r => {
              if (tab === 'En attente') return r.statut === 'Demandee';
              if (tab === 'Approuvées') return r.statut === 'Approuvee';
              if (tab === 'Historique') return ['Rejetee', 'Annulee'].includes(r.statut);
              return true;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab 
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab}
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filter bar */}
        <div className="card p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row flex-wrap gap-3">
          <div className="relative flex-[2] min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Rechercher par salle, type ou motif..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all" />
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" /> <span className="font-medium">{error}</span>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="card p-12 text-center flex flex-col items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Aucune réservation</h3>
            <p className="text-slate-500 mt-1">Vous n'avez aucune demande dans cette catégorie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReservations.map(res => (
              <div key={res.id_reservation} className="card p-5 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors shadow-sm">
                
                <div className="flex justify-between items-start mb-4">
                  <StatusBadge statut={res.statut} />
                  {(res.statut === 'Demandee' || res.statut === 'Approuvee') && (
                    <button 
                      onClick={() => setReservationToCancel(res)}
                      className="text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded-lg transition-colors p-1.5"
                      title="Annuler la réservation"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white leading-tight">
                        Salle {res.salle?.numero || 'Inconnue'}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{res.salle?.nom || res.salle?.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 pt-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium capitalize">{formatDateFr(res.date)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">
                      {formatTime(res.heure_debut)} — {formatTime(res.heure_fin)}
                    </span>
                  </div>

                  {res.motif && (
                    <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300 mt-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-medium italic line-clamp-2">{res.motif}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateReservationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchReservations}
          pushToast={pushToast}
        />
      )}

      {reservationToCancel && (
        <CancelReservationModal
          reservation={reservationToCancel}
          onClose={() => setReservationToCancel(null)}
          onSaved={fetchReservations}
          pushToast={pushToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}