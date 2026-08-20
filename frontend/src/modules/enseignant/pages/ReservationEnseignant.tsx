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
  Building2
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

// ⚠️ REMPLACEZ PAR L'ID DE L'ENSEIGNANT CONNECTÉ (depuis votre contexte d'Auth)
const ID_ENSEIGNANT_CONNECTE = "123e4567-e89b-12d3-a456-426614174000"; 
const API_BASE = 'http://localhost:3000/api/enseignant';

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
  // Extrait "HH:mm" depuis "1970-01-01T14:30:00.000Z" ou "14:30:00"
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
    Demandee: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    Approuvee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    Rejetee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    Annulee: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[statut]}`}>
      {statut}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Create Reservation Modal
// ─────────────────────────────────────────────────────────────

function CreateReservationModal({
  onClose,
  onCreated,
  pushToast,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
  pushToast: (type: Toast['type'], message: string) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Data
  const [date, setDate] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [sallesDisponibles, setSallesDisponibles] = useState<Salle[]>([]);
  const [selectedSalleId, setSelectedSalleId] = useState<string>('');
  const [motif, setMotif] = useState('');

  const searchSalles = async () => {
    setFormError(null);
    if (!date || !heureDebut || !heureFin) {
      setFormError('Veuillez remplir la date et les heures.');
      return;
    }
    if (heureFin <= heureDebut) {
      setFormError("L'heure de fin doit être après l'heure de début.");
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({ date, heure_debut: heureDebut, heure_fin: heureFin });
      const res = await fetch(`${API_BASE}/salles/disponibles?${query}`);
      const json = await res.json();
      
      if (!res.ok || !json.success) throw new Error(json.message);
      
      setSallesDisponibles(json.data || []);
      if (json.data.length === 0) {
        setFormError('Aucune salle disponible pour ce créneau.');
      } else {
        setStep(2);
      }
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la recherche des salles.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSalleId) {
      setFormError('Veuillez sélectionner une salle.');
      return;
    }
    setFormError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_salle: selectedSalleId,
          id_demandeur: ID_ENSEIGNANT_CONNECTE,
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
      <div className="card w-full max-w-lg shadow-2xl p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Réserver une salle</h2>
            <p className="text-sm text-slate-500">Étape {step} sur 2</p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Heure de début</label>
                  <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} className="w-full input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Heure de fin</label>
                  <input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} className="w-full input-field" />
                </div>
              </div>
              <button onClick={searchSalles} disabled={loading} className="w-full mt-4 flex items-center justify-center gap-2 btn-primary py-2.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Chercher les salles disponibles
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Choisir une salle</label>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {sallesDisponibles.map(salle => (
                    <div 
                      key={salle.id_salle}
                      onClick={() => setSelectedSalleId(salle.id_salle)}
                      className={`cursor-pointer p-3 border rounded-xl transition-all ${
                        selectedSalleId === salle.id_salle 
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm ring-1 ring-primary-500' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                      }`}
                    >
                      <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary-500" />
                        {salle.numero}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{salle.nom || salle.type}</p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">{salle.capacite} places</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Motif (Optionnel)</label>
                <textarea 
                  value={motif} 
                  onChange={e => setMotif(e.target.value)} 
                  rows={2} 
                  className="w-full input-field resize-none"
                  placeholder="Ex: Séance de rattrapage, Examen..."
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} disabled={loading} className="w-1/3 btn-secondary py-2.5">
                  Retour
                </button>
                <button onClick={handleSubmit} disabled={loading || !selectedSalleId} className="w-2/3 flex items-center justify-center gap-2 btn-primary py-2.5">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmer la réservation
                </button>
              </div>
            </div>
          )}
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
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reservations/${ID_ENSEIGNANT_CONNECTE}`);
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

  const handleAnnuler = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return;
    try {
      const res = await fetch(`${API_BASE}/reservations/${id}/annuler`, { method: 'PUT' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      
      pushToast('success', 'Réservation annulée avec succès.');
      fetchReservations();
    } catch (err: any) {
      pushToast('error', err.message || "Erreur lors de l'annulation.");
    }
  };

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Mes Réservations de Salles
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gérez vos demandes de salles pour vos rattrapages et examens.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2 whitespace-nowrap">
            <Plus className="h-4 w-4" />
            Nouvelle Réservation
          </button>
        </header>

        {/* Content */}
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" /> {error}
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="card p-12 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Aucune réservation</h3>
            <p className="text-slate-500 mt-1">Vous n'avez pas encore demandé de salle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reservations.map(res => (
              <div key={res.id_reservation} className="card p-5 flex flex-col border border-slate-200 dark:border-slate-800 hover:border-primary-300 transition-colors">
                
                <div className="flex justify-between items-start mb-4">
                  <StatusBadge statut={res.statut} />
                  {(res.statut === 'Demandee' || res.statut === 'Approuvee') && (
                    <button 
                      onClick={() => handleAnnuler(res.id_reservation)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="Annuler la réservation"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary-500 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white leading-tight">
                        Salle {res.salle?.numero || 'Inconnue'}
                      </p>
                      <p className="text-xs text-slate-500">{res.salle?.nom || res.salle?.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm capitalize">{formatDateFr(res.date)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">
                      {formatTime(res.heure_debut)} — {formatTime(res.heure_fin)}
                    </span>
                  </div>

                  {res.motif && (
                    <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                      <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs italic line-clamp-2">{res.motif}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateReservationModal
          onClose={() => setShowModal(false)}
          onCreated={fetchReservations}
          pushToast={pushToast}
        />
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
            t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 
            t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {t.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="text-sm font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}