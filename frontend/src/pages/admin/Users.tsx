import { useEffect, useState, useMemo } from "react";
import {
    Plus, Search, Shield, Power, KeyRound, X, FileUp, Upload, CheckCircle2,
    Trash2, Loader2, Users, UserCheck, UserX, ArrowUpDown, Filter, Crown, GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    getUsers, createUser, toggleUserStatus, resetUserPassword, getRoles,
    extractUsersFromFile, bulkCreateUsers,
} from "../../services/superadmin.service";

const ROLE_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
    SUPER_ADMIN: { bg: "bg-rose-50 dark:bg-rose-950/20", text: "text-rose-700 dark:text-rose-400", icon: Crown },
    SCOLARITE: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", icon: Shield },
    ETUDIANT: { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", icon: GraduationCap },
};

const getRoleStyle = (roleName: string) => ROLE_STYLES[roleName] || { bg: "bg-slate-50 dark:bg-slate-900/40", text: "text-slate-700 dark:text-slate-300", icon: Shield };
const getInitials = (prenom?: string, nom?: string) => ((prenom?.[0] || "") + (nom?.[0] || "")).toUpperCase() || "?";

const SCROLLBAR_CLASSES = `
    [&::-webkit-scrollbar]:w-2
    [&::-webkit-scrollbar-track]:bg-slate-100
    dark:[&::-webkit-scrollbar-track]:bg-slate-800
    [&::-webkit-scrollbar-thumb]:rounded-full
    [&::-webkit-scrollbar-thumb]:bg-slate-300
    dark:[&::-webkit-scrollbar-thumb]:bg-slate-600
    [&::-webkit-scrollbar-corner]:bg-transparent
    [scrollbar-width:thin]
    dark:[scrollbar-color:#475569_#1e293b]
`;

const GRID = "grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)] items-center gap-2.5";

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<"name" | "created">("created");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [formData, setFormData] = useState({ nom: "", prenom: "", email: "", telephone: "", roleName: "ETUDIANT", password: "" });
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importRole, setImportRole] = useState("ETUDIANT");
    const [extractedStudents, setExtractedStudents] = useState<any[]>([]);
    const [extracting, setExtracting] = useState(false);
    const [creating, setCreating] = useState(false);
    const [importResults, setImportResults] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, rolesData] = await Promise.all([getUsers({ search, role: roleFilter }), getRoles()]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [search, roleFilter]);

    const stats = useMemo(() => ({
        total: users.length,
        active: users.filter((u) => u.actif).length,
        disabled: users.filter((u) => !u.actif).length,
    }), [users]);

    const processedUsers = useMemo(() => {
        let result = [...users];
        if (statusFilter !== "all") result = result.filter((u) => (statusFilter === "active" ? u.actif : !u.actif));
        result.sort((a, b) => {
            let cmp = 0;
            if (sortBy === "name") cmp = `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`);
            else cmp = new Date(a.date_creation).getTime() - new Date(b.date_creation).getTime();
            return sortOrder === "asc" ? cmp : -cmp;
        });
        return result;
    }, [users, statusFilter, sortBy, sortOrder]);

    const toggleSort = (field: "name" | "created") => {
        if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else { setSortBy(field); setSortOrder("desc"); }
    };

    const handleCreate = async () => {
        try {
            await createUser(formData);
            setShowModal(false);
            setFormData({ nom: "", prenom: "", email: "", telephone: "", roleName: "ETUDIANT", password: "" });
            loadData();
        } catch (err: any) { alert(err.response?.data?.message || "Erreur lors de la création"); }
    };

    const handleToggleStatus = async (id: string) => {
        if (!confirm("Confirmer le changement de statut ?")) return;
        try { await toggleUserStatus(id); loadData(); }
        catch (err: any) { alert(err.response?.data?.message || "Erreur"); }
    };

    const handleResetPassword = async (id: string) => {
        const newPassword = prompt("Nouveau mot de passe (min 8 caractères) :");
        if (!newPassword || newPassword.length < 8) return alert("Mot de passe trop court");
        try { await resetUserPassword(id, newPassword); alert("✅ Mot de passe réinitialisé"); }
        catch (err: any) { alert(err.response?.data?.message || "Erreur"); }
    };

    const handleExtract = async () => {
        if (!importFile) return;
        try {
            setExtracting(true);
            const students = await extractUsersFromFile(importFile);
            setExtractedStudents(students);
        } catch (err: any) { alert("Erreur d'extraction : " + (err.response?.data?.message || err.message)); }
        finally { setExtracting(false); }
    };

    const updateExtractedStudent = (index: number, field: string, value: string) => {
        setExtractedStudents((prev) => { const copy = [...prev]; copy[index] = { ...copy[index], [field]: value }; return copy; });
    };

    const removeExtractedStudent = (index: number) => {
        setExtractedStudents((prev) => prev.filter((_, i) => i !== index));
    };

    const handleBulkCreate = async () => {
        try {
            setCreating(true);
            const withRole = extractedStudents.map((s) => ({ ...s, roleName: importRole }));
            const results = await bulkCreateUsers(withRole);
            setImportResults(results);
            loadData();
        } catch (err: any) { alert("Erreur : " + (err.response?.data?.message || err.message)); }
        finally { setCreating(false); }
    };

    const resetImport = () => { setImportFile(null); setExtractedStudents([]); setImportResults(null); };
    const closeImportModal = () => { setShowImportModal(false); resetImport(); };
    const hasActiveFilters = search || roleFilter || statusFilter !== "all";

    return (
        <div className="flex h-[calc(100vh-120px)] w-full max-w-full min-w-0 flex-col gap-3">
            <header className="flex shrink-0 items-end justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <Users size={14} className="text-slate-700 dark:text-slate-300" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-[16px] font-semibold tracking-tight text-slate-900 dark:text-white">Utilisateurs</h1>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Gestion des comptes et contrôle d'accès</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => setShowImportModal(true)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                        <FileUp size={12} />
                        Importer
                    </button>
                    <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                        <Plus size={12} />
                        Nouvel utilisateur
                    </button>
                </div>
            </header>

            <div className="grid shrink-0 grid-cols-3 gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-sm">
                        <Users size={13} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold tabular-nums text-slate-900 dark:text-white">{stats.total}</p>
                        <p className="truncate text-[9px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Total utilisateurs</p>
                    </div>
                </div>
                <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm">
                        <UserCheck size={13} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold tabular-nums text-slate-900 dark:text-white">{stats.active}</p>
                        <p className="truncate text-[9px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Actifs</p>
                    </div>
                </div>
                <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-sm">
                        <UserX size={13} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold tabular-nums text-slate-900 dark:text-white">{stats.disabled}</p>
                        <p className="truncate text-[9px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Désactivés</p>
                    </div>
                </div>
            </div>

            <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, email..." className="w-full rounded-md border border-slate-200 bg-white py-1 pl-7 pr-2.5 text-[11.5px] text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                        <Filter size={10} className="text-slate-400" />
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <option value="">Tous les rôles</option>
                            {roles.map((r) => <option key={r.id_role} value={r.nom_role}>{r.nom_role}</option>)}
                        </select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <option value="all">Tous les statuts</option>
                            <option value="active">Actifs</option>
                            <option value="disabled">Désactivés</option>
                        </select>
                        {hasActiveFilters && (
                            <button onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter("all"); }} className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                                <X size={9} />
                                Effacer
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">{processedUsers.length}</span> utilisateur{processedUsers.length !== 1 ? "s" : ""}
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Trier :</span>
                    <button onClick={() => toggleSort("name")} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition ${sortBy === "name" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                        Nom
                        {sortBy === "name" && <ArrowUpDown size={8} />}
                    </button>
                    <button onClick={() => toggleSort("created")} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition ${sortBy === "created" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                        Créé le
                        {sortBy === "created" && <ArrowUpDown size={8} />}
                    </button>
                </div>
            </div>

            <div className="min-h-0 w-full max-w-full min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-full flex-col">
                    <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40">
                        <div className={`${GRID} px-3 py-2`}>
                            <button onClick={() => toggleSort("name")} className={`inline-flex min-w-0 items-center gap-0.5 text-left text-[9px] font-semibold uppercase tracking-wider ${sortBy === "name" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                Utilisateur
                                <ArrowUpDown size={8} className={sortBy === "name" ? "opacity-100" : "opacity-40"} />
                            </button>
                            <div className="min-w-0 truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rôle</div>
                            <div className="min-w-0 truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Statut</div>
                            <button onClick={() => toggleSort("created")} className={`inline-flex min-w-0 items-center gap-0.5 text-left text-[9px] font-semibold uppercase tracking-wider ${sortBy === "created" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                Créé le
                                <ArrowUpDown size={8} className={sortBy === "created" ? "opacity-100" : "opacity-40"} />
                            </button>
                            <div className="min-w-0 truncate text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</div>
                        </div>
                    </div>

                    <div className={`min-h-0 flex-1 overflow-y-auto ${SCROLLBAR_CLASSES}`}>
                        {loading ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className={`${GRID} px-3 py-2.5`}>
                                        <div className="flex min-w-0 items-center gap-2">
                                            <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <div className="h-3 w-32 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                                <div className="h-2 w-44 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                            </div>
                                        </div>
                                        <div className="h-3.5 w-16 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                        <div className="h-3.5 w-14 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                        <div className="h-3 w-20 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                        <div className="ml-auto h-6 w-14 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                    </div>
                                ))}
                            </div>
                        ) : processedUsers.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                    <Search size={15} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-medium text-slate-900 dark:text-white">Aucun utilisateur trouvé</p>
                                    <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                                        {hasActiveFilters ? "Ajustez vos filtres." : "Créez un utilisateur ou importez depuis un fichier."}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {processedUsers.map((user) => {
                                    const roleStyle = getRoleStyle(user.nom_role);
                                    const RoleIcon = roleStyle.icon;

                                    return (
                                        <div key={user.id_utilisateur} className={`${GRID} px-3 py-2 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/30`}>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <div className="relative shrink-0">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-[9px] font-bold text-white">
                                                        {getInitials(user.prenom, user.nom)}
                                                    </div>
                                                    <span className={`absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${user.actif ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-[11.5px] font-semibold text-slate-900 dark:text-white">{user.prenom} {user.nom}</p>
                                                    <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user.email}</p>
                                                </div>
                                            </div>

                                            <div className="min-w-0">
                                                <span className={`inline-flex max-w-full items-center gap-0.5 truncate rounded px-1.5 py-0.5 text-[9px] font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
                                                    <RoleIcon size={9} className="shrink-0" />
                                                    <span className="truncate">{user.nom_role}</span>
                                                </span>
                                            </div>

                                            <div className="min-w-0">
                                                <span className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${user.actif ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"}`}>
                                                    <span className={`h-1 w-1 shrink-0 rounded-full ${user.actif ? "bg-emerald-500" : "bg-rose-500"}`} />
                                                    {user.actif ? "Actif" : "Désactivé"}
                                                </span>
                                            </div>

                                            <div className="min-w-0 truncate font-mono text-[10px] tabular-nums text-slate-600 dark:text-slate-300">
                                                {new Date(user.date_creation).toLocaleDateString("fr-FR")}
                                            </div>

                                            <div className="flex min-w-0 justify-end gap-0.5">
                                                <button onClick={() => handleResetPassword(user.id_utilisateur)} title="Réinitialiser le mot de passe" className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-slate-700 dark:hover:bg-amber-900/20">
                                                    <KeyRound size={11} />
                                                </button>
                                                <button onClick={() => handleToggleStatus(user.id_utilisateur)} title={user.actif ? "Désactiver" : "Activer"} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border transition ${user.actif ? "border-slate-200 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:bg-rose-900/20" : "border-slate-200 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:hover:bg-emerald-900/20"}`}>
                                                    <Power size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ duration: 0.15 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                                <div>
                                    <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">Nouvel utilisateur</h2>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Créer un compte individuel</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <X size={13} />
                                </button>
                            </div>
                            <div className="space-y-2.5 p-4">
                                <div className="grid grid-cols-2 gap-1.5">
                                    <input value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} placeholder="Prénom" className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11.5px] focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                    <input value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} placeholder="Nom" className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11.5px] focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                </div>
                                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11.5px] focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                <input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} placeholder="Téléphone (optionnel)" className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11.5px] focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                <select value={formData.roleName} onChange={(e) => setFormData({ ...formData, roleName: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11.5px] focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                    {roles.map((r) => <option key={r.id_role} value={r.nom_role}>{r.nom_role}</option>)}
                                </select>
                                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Mot de passe" className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11.5px] focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            </div>
                            <div className="flex justify-end gap-1.5 border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">
                                <button onClick={() => setShowModal(false)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Annuler</button>
                                <button onClick={handleCreate} disabled={!formData.nom || !formData.prenom || !formData.email} className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900">Créer</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showImportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeImportModal} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ duration: 0.15 }} onClick={(e) => e.stopPropagation()} className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" style={{ maxHeight: "85vh" }}>
                            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                                <div className="flex min-w-0 items-center gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                        <FileUp size={13} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">Importer des utilisateurs</h2>
                                        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                            {extractedStudents.length > 0 ? `${extractedStudents.length} détecté(s) — vérifiez avant l'import` : "PDF, Word, Excel, CSV ou ZIP (ZIP imbriqués supportés)"}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={closeImportModal} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <X size={13} />
                                </button>
                            </div>

                            <div className={`min-h-0 flex-1 overflow-y-auto p-0 ${SCROLLBAR_CLASSES}`}>
                                {importResults ? (
                                    <div className="space-y-3 p-4">
                                        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                                            <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                                            <h3 className="text-[12px] font-semibold text-emerald-800 dark:text-emerald-300">Import terminé</h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2.5">
                                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/20">
                                                <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Créés</p>
                                                <p className="mt-0.5 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{importResults.created?.length || 0}</p>
                                            </div>
                                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900 dark:bg-amber-950/20">
                                                <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Ignorés</p>
                                                <p className="mt-0.5 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{importResults.skipped?.length || 0}</p>
                                            </div>
                                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 dark:border-rose-900 dark:bg-rose-950/20">
                                                <p className="text-[9px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Échecs</p>
                                                <p className="mt-0.5 text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">{importResults.failed?.length || 0}</p>
                                            </div>
                                        </div>
                                        {importResults.skipped?.length > 0 && (
                                            <div className="rounded-lg border border-amber-200 bg-white p-2.5 dark:border-amber-900 dark:bg-slate-900">
                                                <p className="mb-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Ignorés (déjà existants) :</p>
                                                <div className={`max-h-28 overflow-y-auto font-mono text-[10px] text-slate-600 dark:text-slate-300 ${SCROLLBAR_CLASSES}`}>
                                                    {importResults.skipped.map((s: any, i: number) => <div key={i}>{s.email} — {s.reason}</div>)}
                                                </div>
                                            </div>
                                        )}
                                        {importResults.failed?.length > 0 && (
                                            <div className="rounded-lg border border-rose-200 bg-white p-2.5 dark:border-rose-900 dark:bg-slate-900">
                                                <p className="mb-1.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400">Échecs :</p>
                                                <div className={`max-h-28 overflow-y-auto font-mono text-[10px] text-slate-600 dark:text-slate-300 ${SCROLLBAR_CLASSES}`}>
                                                    {importResults.failed.map((s: any, i: number) => <div key={i}>{s.email} — {s.reason}</div>)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : extractedStudents.length > 0 ? (
                                    <div className="p-3">
                                        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
                                            <p className="min-w-0 text-[11px] text-slate-600 dark:text-slate-300">Vérifiez les données extraites. Modifiez ou supprimez des lignes avant de créer les comptes.</p>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Rôle :</span>
                                                <select value={importRole} onChange={(e) => setImportRole(e.target.value)} className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    {roles.map((r) => <option key={r.id_role} value={r.nom_role}>{r.nom_role}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                            <table className="w-full min-w-[480px]">
                                                <thead className="bg-slate-50 dark:bg-slate-800/60">
                                                    <tr className="border-b border-slate-200 dark:border-slate-800">
                                                        <th className="px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">#</th>
                                                        <th className="px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Prénom</th>
                                                        <th className="px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Nom</th>
                                                        <th className="px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Email</th>
                                                        <th className="px-2.5 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {extractedStudents.map((s, i) => (
                                                        <tr key={i} className="group">
                                                            <td className="px-2.5 py-1 font-mono text-[10px] text-slate-400">{i + 1}</td>
                                                            <td className="px-1.5 py-0.5">
                                                                <input value={s.prenom} onChange={(e) => updateExtractedStudent(i, "prenom", e.target.value)} className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 font-mono text-[10.5px] focus:border-slate-300 focus:bg-white focus:outline-none dark:focus:border-slate-700 dark:focus:bg-slate-800 dark:text-white" />
                                                            </td>
                                                            <td className="px-1.5 py-0.5">
                                                                <input value={s.nom} onChange={(e) => updateExtractedStudent(i, "nom", e.target.value)} className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 font-mono text-[10.5px] focus:border-slate-300 focus:bg-white focus:outline-none dark:focus:border-slate-700 dark:focus:bg-slate-800 dark:text-white" />
                                                            </td>
                                                            <td className="px-1.5 py-0.5">
                                                                <input value={s.email} onChange={(e) => updateExtractedStudent(i, "email", e.target.value)} className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 font-mono text-[10.5px] focus:border-slate-300 focus:bg-white focus:outline-none dark:focus:border-slate-700 dark:focus:bg-slate-800 dark:text-white" />
                                                            </td>
                                                            <td className="px-1.5 py-0.5 text-right">
                                                                <button onClick={() => removeExtractedStudent(i)} className="rounded p-0.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-900/20">
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5">
                                        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) setImportFile(file); }} className="flex flex-col items-center justify-center gap-2.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                                                <Upload size={17} />
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-semibold text-slate-900 dark:text-white">Déposez votre fichier ici ou cliquez pour parcourir</p>
                                                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">PDF · DOC · DOCX · XLS · XLSX · CSV · ZIP (max 10 Mo)</p>
                                                <p className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-500">Les ZIP imbriqués sont explorés automatiquement (profondeur max 5)</p>
                                            </div>
                                            <label className="mt-1.5 cursor-pointer rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                                                Choisir un fichier
                                                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImportFile(f); }} />
                                            </label>
                                        </div>
                                        {importFile && (
                                            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-2.5 dark:border-blue-900 dark:bg-blue-950/20">
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                    <FileUp size={13} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[11px] font-semibold text-blue-800 dark:text-blue-300">{importFile.name}</p>
                                                        <p className="text-[9px] text-blue-600 dark:text-blue-400">{(importFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setImportFile(null)} className="rounded p-0.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">
                                {importResults ? (
                                    <button onClick={closeImportModal} className="ml-auto rounded-md bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">Terminé</button>
                                ) : (
                                    <>
                                        <button onClick={() => (extractedStudents.length > 0 ? resetImport() : closeImportModal())} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {extractedStudents.length > 0 ? "Retour" : "Annuler"}
                                        </button>
                                        {extractedStudents.length > 0 ? (
                                            <button onClick={handleBulkCreate} disabled={creating} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                                                {creating ? (<><Loader2 size={11} className="animate-spin" />Création de {extractedStudents.length} comptes...</>) : (<><CheckCircle2 size={11} />Créer {extractedStudents.length} comptes</>)}
                                            </button>
                                        ) : (
                                            <button onClick={handleExtract} disabled={!importFile || extracting} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                                                {extracting ? (<><Loader2 size={11} className="animate-spin" />Extraction...</>) : (<><FileUp size={11} />Extraire les données</>)}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}