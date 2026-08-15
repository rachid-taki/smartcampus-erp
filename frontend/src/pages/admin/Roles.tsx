import { useEffect, useState, useMemo } from "react";
import {
    Plus, Shield, Users, X, KeyRound, Crown, CheckCircle2, Search, Info,
    Activity, ArrowUpDown, ChevronRight, GraduationCap, Filter, Check, Layers, Link2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    getRoles, createRole, getRolePermissions, getPermissions, updateRolePermissions,
} from "../../services/superadmin.service";

const ROLE_STYLES: Record<string, { gradient: string; bg: string; text: string; border: string; icon: any; label: string }> = {
    SUPER_ADMIN: { gradient: "from-rose-500 via-red-500 to-orange-600", bg: "bg-rose-50 dark:bg-rose-950/20", text: "text-rose-700 dark:text-rose-400", border: "border-rose-200 dark:border-rose-900", icon: Crown, label: "Suprême" },
    SCOLARITE: { gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-900", icon: Shield, label: "Administration" },
    ETUDIANT: { gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-900", icon: GraduationCap, label: "Utilisateur" },
    PROFESSOR: { gradient: "from-amber-500 to-orange-600", bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-900", icon: Users, label: "Enseignant" },
};

const getRoleStyle = (roleName: string) => ROLE_STYLES[roleName] || { gradient: "from-slate-500 to-slate-700", bg: "bg-slate-50 dark:bg-slate-900/40", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-800", icon: Shield, label: "Personnalisé" };

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

export default function AdminRoles() {
    const [roles, setRoles] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [permissionRole, setPermissionRole] = useState<any | null>(null);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const [savingPermissions, setSavingPermissions] = useState(false);
    const [formData, setFormData] = useState({ nom_role: "", description: "" });
    const [search, setSearch] = useState("");
    const [coverageFilter, setCoverageFilter] = useState<"all" | "empty" | "partial" | "full">("all");
    const [expandedModule, setExpandedModule] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"name" | "users" | "perms">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const loadRoles = async () => {
        try {
            setLoading(true);
            const [rolesData, permsData] = await Promise.all([getRoles(), getPermissions()]);
            setRoles(Array.isArray(rolesData) ? rolesData : []);
            setPermissions(Array.isArray(permsData) ? permsData : []);
            const map: Record<string, string[]> = {};
            await Promise.all((Array.isArray(rolesData) ? rolesData : []).map(async (role: any) => {
                const perms = await getRolePermissions(role.id_role);
                map[role.id_role] = Array.isArray(perms) ? perms : [];
            }));
            setRolePermissionsMap(map);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadRoles(); }, []);

    const totalPerms = permissions.length;

    const stats = useMemo(() => {
        const totalRoles = roles.length;
        const totalUsers = roles.reduce((sum, r) => sum + (parseInt(r.users_count, 10) || 0), 0);
        const avgCoverage = roles.length > 0 && totalPerms > 0
            ? Math.round((roles.reduce((sum, r) => sum + (rolePermissionsMap[r.id_role]?.length || 0), 0) / (roles.length * totalPerms)) * 100)
            : 0;
        return { totalRoles, totalUsers, avgCoverage };
    }, [roles, rolePermissionsMap, totalPerms]);

    const processedRoles = useMemo(() => {
        let result = [...roles];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter((r) => r.nom_role.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q));
        }
        if (coverageFilter !== "all" && totalPerms > 0) {
            result = result.filter((r) => {
                const count = rolePermissionsMap[r.id_role]?.length || 0;
                const pct = (count / totalPerms) * 100;
                if (coverageFilter === "empty") return count === 0;
                if (coverageFilter === "partial") return count > 0 && pct < 100;
                if (coverageFilter === "full") return pct === 100;
                return true;
            });
        }
        result.sort((a, b) => {
            let cmp = 0;
            if (sortBy === "name") cmp = a.nom_role.localeCompare(b.nom_role);
            else if (sortBy === "users") cmp = (a.users_count || 0) - (b.users_count || 0);
            else if (sortBy === "perms") cmp = (rolePermissionsMap[a.id_role]?.length || 0) - (rolePermissionsMap[b.id_role]?.length || 0);
            return sortOrder === "asc" ? cmp : -cmp;
        });
        return result;
    }, [roles, search, coverageFilter, sortBy, sortOrder, rolePermissionsMap, totalPerms]);

    const handleCreateRole = async () => {
        if (!formData.nom_role.trim()) return;
        try {
            await createRole({ nom_role: formData.nom_role.toUpperCase().replace(/\s+/g, "_"), description: formData.description });
            setShowCreateModal(false);
            setFormData({ nom_role: "", description: "" });
            loadRoles();
        } catch (err: any) { alert(err.response?.data?.message || "Erreur lors de la création"); }
    };

    const handleOpenPermissions = async (role: any) => {
        const perms = rolePermissionsMap[role.id_role] || [];
        setRolePermissions(perms);
        setPermissionRole(role);
        setExpandedModule(null);
    };

    const togglePermission = (permId: string) => {
        setRolePermissions((prev) => prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]);
    };

    const handleSavePermissions = async () => {
        if (!permissionRole) return;
        try {
            setSavingPermissions(true);
            await updateRolePermissions(permissionRole.id_role, rolePermissions);
            alert("✅ Permissions mises à jour");
            setPermissionRole(null);
            loadRoles();
        } catch (err: any) { alert(err.response?.data?.message || "Erreur"); }
        finally { setSavingPermissions(false); }
    };

    const selectAllInModule = (module: string) => {
        const ids = permissions.filter((p) => (p.module || "Général") === module).map((p) => p.id_permission);
        setRolePermissions((prev) => Array.from(new Set([...prev, ...ids])));
    };

    const deselectAllInModule = (module: string) => {
        const ids = permissions.filter((p) => (p.module || "Général") === module).map((p) => p.id_permission);
        setRolePermissions((prev) => prev.filter((id) => !ids.includes(id)));
    };

    const permissionsByModule = useMemo(() => {
        return permissions.reduce((acc: any, perm) => {
            const module = perm.module || "Général";
            if (!acc[module]) acc[module] = [];
            acc[module].push(perm);
            return acc;
        }, {});
    }, [permissions]);

    const toggleSort = (field: "name" | "users" | "perms") => {
        if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else { setSortBy(field); setSortOrder("asc"); }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] flex-col gap-3">
            <header className="flex shrink-0 items-end justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <Shield size={14} className="text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                        <h1 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-white">Rôles</h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Contrôle d'accès et gestion des permissions</p>
                    </div>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                    <Plus size={12} />
                    Nouveau rôle
                </button>
            </header>

            <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
                <StatCard icon={Shield} label="Rôles" value={stats.totalRoles} sub="profils d'accès" accent="bg-violet-600" />
                <StatCard icon={Users} label="Utilisateurs" value={stats.totalUsers} sub="comptes attribués" accent="bg-blue-600" />
                <StatCard icon={Layers} label="Permissions" value={totalPerms} sub="référentiel global" accent="bg-slate-900 dark:bg-white" />
                <StatCard icon={Activity} label="Couverture" value={`${stats.avgCoverage}%`} sub="moyenne par rôle" accent="bg-emerald-600" />
            </div>

            <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un rôle par nom ou description..." className="w-full rounded-md border border-slate-200 bg-white py-1 pl-7 pr-2.5 text-[11.5px] text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                    </div>
                    <div className="flex items-center gap-1">
                        <Filter size={10} className="text-slate-400" />
                        <select value={coverageFilter} onChange={(e) => setCoverageFilter(e.target.value as any)} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <option value="all">Toute couverture</option>
                            <option value="empty">Vide (0%)</option>
                            <option value="partial">Partielle (1-99%)</option>
                            <option value="full">Complète (100%)</option>
                        </select>
                        {(search || coverageFilter !== "all") && (
                            <button onClick={() => { setSearch(""); setCoverageFilter("all"); }} className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                                <X size={9} />
                                Effacer
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 items-center justify-between">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">{processedRoles.length}</span> rôle{processedRoles.length !== 1 ? "s" : ""} · {totalPerms} permissions
                </p>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-full flex-col">
                    <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40">
                        <div className="grid grid-cols-[1fr_90px_90px_160px_130px] items-center gap-2.5 px-3 py-2">
                            <SortHeader label="Rôle" field="name" active={sortBy === "name"} order={sortOrder} onSort={toggleSort} />
                            <SortHeader label="Utilisateurs" field="users" active={sortBy === "users"} order={sortOrder} onSort={toggleSort} align="center" />
                            <SortHeader label="Permissions" field="perms" active={sortBy === "perms"} order={sortOrder} onSort={toggleSort} align="center" />
                            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Couverture</div>
                            <div className="text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</div>
                        </div>
                    </div>

                    <div className={`flex-1 overflow-y-auto ${SCROLLBAR_CLASSES}`}>
                        {loading ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="grid grid-cols-[1fr_90px_90px_160px_130px] items-center gap-2.5 px-3 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                                            <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                        </div>
                                        <div className="h-3.5 w-7 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                        <div className="h-3.5 w-7 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                        <div className="h-1.5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                        <div className="ml-auto h-7 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                    </div>
                                ))}
                            </div>
                        ) : processedRoles.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                    <Search size={15} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-medium text-slate-900 dark:text-white">Aucun rôle trouvé</p>
                                    <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">Ajustez vos filtres ou créez un nouveau rôle.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {processedRoles.map((role) => {
                                    const style = getRoleStyle(role.nom_role);
                                    const RoleIcon = style.icon;
                                    const permCount = rolePermissionsMap[role.id_role]?.length || 0;
                                    const pct = totalPerms > 0 ? Math.round((permCount / totalPerms) * 100) : 0;
                                    const isSuper = role.nom_role === "SUPER_ADMIN";

                                    return (
                                        <div key={role.id_role} className="grid grid-cols-[1fr_90px_90px_160px_130px] items-center gap-2.5 px-3 py-2.5 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${style.gradient} text-white shadow-sm`}>
                                                    <RoleIcon size={13} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="truncate font-mono text-[11.5px] font-semibold text-slate-900 dark:text-white">{role.nom_role}</p>
                                                        {isSuper && (
                                                            <span className="inline-flex items-center gap-0.5 rounded bg-gradient-to-r from-rose-500 to-red-600 px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white">
                                                                <Crown size={7} />
                                                                {style.label}
                                                            </span>
                                                        )}
                                                        {!isSuper && (
                                                            <span className={`rounded px-1 py-0.5 text-[8px] font-medium uppercase tracking-wider ${style.bg} ${style.text}`}>{style.label}</span>
                                                        )}
                                                    </div>
                                                    {role.description && <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{role.description}</p>}
                                                </div>
                                            </div>

                                            <div className="text-center">
                                                <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    <Users size={9} />
                                                    {role.users_count || 0}
                                                </span>
                                            </div>

                                            <div className="text-center">
                                                <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    <KeyRound size={9} />
                                                    {permCount}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="mb-0.5 flex items-center justify-between">
                                                    <span className="text-[9px] text-slate-500 dark:text-slate-400">{permCount}/{totalPerms}</span>
                                                    <span className="font-mono text-[9px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{pct}%</span>
                                                </div>
                                                <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <div className={`h-full rounded-full bg-gradient-to-r ${style.gradient} transition-all`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-0.5">
                                                <button onClick={() => handleOpenPermissions(role)} className={`inline-flex items-center gap-1 rounded-md border ${style.border} ${style.bg} px-2 py-1 text-[10px] font-semibold ${style.text} transition hover:shadow-sm`}>
                                                    <KeyRound size={10} />
                                                    Permissions
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
                {showCreateModal && (
                    <Modal onClose={() => setShowCreateModal(false)} title="Nouveau rôle" maxWidth="md">
                        <div className="space-y-3 p-4">
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-slate-500">Nom du rôle</label>
                                <input value={formData.nom_role} onChange={(e) => setFormData({ ...formData, nom_role: e.target.value })} placeholder="ex. GESTIONNAIRE_RH" className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[12px] focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                <p className="mt-0.5 text-[9px] text-slate-400">Sera converti en MAJUSCULES_AVEC_UNDERSCORES</p>
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-slate-500">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Décrivez le rôle..." className="w-full resize-none rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-1.5 border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">
                            <button onClick={() => setShowCreateModal(false)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Annuler</button>
                            <button onClick={handleCreateRole} disabled={!formData.nom_role.trim()} className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900">Créer le rôle</button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {permissionRole && (
                    <Modal onClose={() => setPermissionRole(null)} title={`Permissions · ${permissionRole.nom_role}`} subtitle={`${rolePermissions.length} / ${totalPerms} sélectionnées`} maxWidth="xl" gradient={getRoleStyle(permissionRole.nom_role).gradient}>
                        <div className={`max-h-[60vh] overflow-y-auto p-3 ${SCROLLBAR_CLASSES}`}>
                            <div className="space-y-1.5">
                                {Object.entries(permissionsByModule).map(([module, perms]: any) => {
                                    const moduleSelected = perms.filter((p: any) => rolePermissions.includes(p.id_permission)).length;
                                    const allSelected = moduleSelected === perms.length;
                                    const noneSelected = moduleSelected === 0;
                                    const isExpanded = expandedModule === module || expandedModule === null;

                                    return (
                                        <div key={module} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                                            <button onClick={() => setExpandedModule(expandedModule === module ? null : module)} className="flex w-full items-center justify-between bg-slate-50 px-2.5 py-1.5 text-left transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800">
                                                <div className="flex items-center gap-1.5">
                                                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                                                        <ChevronRight size={11} className="text-slate-400" />
                                                    </motion.div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">{module}</span>
                                                    <span className={`rounded-full px-1 py-0.5 font-mono text-[9px] font-semibold tabular-nums ${allSelected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : noneSelected ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                                                        {moduleSelected}/{perms.length}
                                                    </span>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); allSelected ? deselectAllInModule(module) : selectAllInModule(module); }} className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700">
                                                    {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                                                </button>
                                            </button>

                                            <AnimatePresence initial={false}>
                                                {isExpanded && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                                                        <div className="grid grid-cols-1 gap-0.5 p-1.5 sm:grid-cols-2">
                                                            {perms.map((perm: any) => {
                                                                const isChecked = rolePermissions.includes(perm.id_permission);
                                                                return (
                                                                    <label key={perm.id_permission} className={`flex cursor-pointer items-start gap-1.5 rounded-md border p-1.5 transition ${isChecked ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/40"}`}>
                                                                        <div className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${isChecked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"}`}>
                                                                            {isChecked && <Check size={9} strokeWidth={3} />}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="truncate font-mono text-[10.5px] font-semibold text-slate-800 dark:text-white">{perm.nom_permission}</p>
                                                                            {perm.description && <p className="mt-0.5 line-clamp-2 text-[9.5px] text-slate-500 dark:text-slate-400">{perm.description}</p>}
                                                                        </div>
                                                                        <input type="checkbox" checked={isChecked} onChange={() => togglePermission(perm.id_permission)} className="sr-only" />
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Info size={10} />
                                Les changements sont appliqués immédiatement
                            </div>
                            <div className="flex gap-1.5">
                                <button onClick={() => setPermissionRole(null)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Annuler</button>
                                <button onClick={handleSavePermissions} disabled={savingPermissions} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                                    {savingPermissions ? (<><div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Enregistrement...</>) : (<><CheckCircle2 size={11} />Enregistrer</>)}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string | number; sub: string; accent: string }) {
    return (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums text-slate-900 dark:text-white">{value}</p>
                    <p className="mt-1 text-[9.5px] text-slate-400 dark:text-slate-500">{sub}</p>
                </div>
                <div className="rounded-md bg-slate-100 p-1.5 dark:bg-slate-800">
                    <Icon size={13} className="text-slate-600 dark:text-slate-400" />
                </div>
            </div>
        </div>
    );
}

function SortHeader({ label, field, active, order, onSort, align = "left" }: { label: string; field: "name" | "users" | "perms"; active: boolean; order: "asc" | "desc"; onSort: (f: "name" | "users" | "perms") => void; align?: "left" | "center" }) {
    return (
        <button onClick={() => onSort(field)} className={`inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider transition ${active ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"} ${align === "center" ? "justify-center" : ""}`}>
            {label}
            <ArrowUpDown size={8} className={active ? "opacity-100" : "opacity-40"} />
        </button>
    );
}

function Modal({ onClose, title, subtitle, maxWidth = "md", gradient, children }: { onClose: () => void; title: string; subtitle?: string; maxWidth?: "md" | "xl"; gradient?: string; children: React.ReactNode }) {
    const width = maxWidth === "xl" ? "max-w-3xl" : "max-w-md";
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ duration: 0.15 }} onClick={(e) => e.stopPropagation()} className={`relative w-full ${width} overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900`}>
                {gradient && <div className={`h-1 bg-gradient-to-r ${gradient}`} />}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                    <div>
                        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">{title}</h2>
                        {subtitle && <p className="text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X size={13} />
                    </button>
                </div>
                {children}
            </motion.div>
        </div>
    );
}