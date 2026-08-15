import { useEffect, useState, useMemo } from "react";
import {
    KeyRound, Shield, Check, Search, Users, FileText, MessageSquareWarning,
    CalendarRange, BellRing, Crown, GraduationCap, Settings2, Info,
    FolderArchive, Mail, UserCog, ShieldCheck, Sparkles, Layers, Link2, ChevronRight, X,
} from "lucide-react";
import { getPermissions, getRoles, getRolePermissions } from "../../services/superadmin.service";

const MODULE_CONFIG: Record<string, { icon: any }> = {
    Authentification: { icon: ShieldCheck }, Profil: { icon: UserCog },
    Demandes: { icon: FileText }, Réclamations: { icon: MessageSquareWarning },
    Documents: { icon: FolderArchive }, Messagerie: { icon: Mail },
    Calendrier: { icon: CalendarRange }, "Assistant IA": { icon: Sparkles },
    Notifications: { icon: BellRing }, Administration: { icon: Shield },
    Scolarité: { icon: GraduationCap }, Général: { icon: Settings2 },
};

const getModuleIcon = (module: string) => (MODULE_CONFIG[module] || MODULE_CONFIG["Général"]).icon;

const ROLE_STYLES: Record<string, { label: string; icon: any }> = {
    SUPER_ADMIN: { label: "Suprême", icon: Crown },
    SCOLARITE: { label: "Administration", icon: Shield },
    ETUDIANT: { label: "Utilisateur", icon: GraduationCap },
    PROFESSOR: { label: "Enseignant", icon: Users },
};

const getRoleStyle = (roleName: string) => ROLE_STYLES[roleName] || { label: "Personnalisé", icon: Shield };

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

export default function AdminPermissions() {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [permsData, rolesData] = await Promise.all([getPermissions(), getRoles()]);
                const safePerms = Array.isArray(permsData) ? permsData : [];
                const safeRoles = Array.isArray(rolesData) ? rolesData : [];
                setPermissions(safePerms);
                setRoles(safeRoles);
                const map: Record<string, string[]> = {};
                await Promise.all(safeRoles.map(async (role: any) => {
                    const rolePerms = await getRolePermissions(role.id_role);
                    map[role.id_role] = Array.isArray(rolePerms) ? rolePerms : [];
                }));
                setRolePermissionsMap(map);
                if (safeRoles.length > 0) setSelectedRoleId(safeRoles[0].id_role);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const selectedRole = useMemo(() => roles.find((r) => r.id_role === selectedRoleId) || null, [roles, selectedRoleId]);
    const selectedRoleStyle = useMemo(() => (selectedRole ? getRoleStyle(selectedRole.nom_role) : null), [selectedRole]);
    const SelectedRoleIcon = selectedRoleStyle?.icon || Shield;

    const selectedPerms = useMemo(() => {
        if (!selectedRole) return [];
        const ids = rolePermissionsMap[selectedRole.id_role] || [];
        return (Array.isArray(permissions) ? permissions : []).filter((p) => ids.includes(p.id_permission));
    }, [selectedRole, rolePermissionsMap, permissions]);

    const filteredSelectedPerms = useMemo(() => {
        const q = (search || "").trim().toLowerCase();
        if (!q) return selectedPerms;
        return selectedPerms.filter((p) =>
            String(p.nom_permission || "").toLowerCase().includes(q) ||
            String(p.description || "").toLowerCase().includes(q) ||
            String(p.module || "").toLowerCase().includes(q)
        );
    }, [selectedPerms, search]);

    const permsByModule = useMemo(() => {
        return filteredSelectedPerms.reduce((acc: any, perm) => {
            const module = perm.module || "Général";
            if (!acc[module]) acc[module] = [];
            acc[module].push(perm);
            return acc;
        }, {});
    }, [filteredSelectedPerms]);

    const totalPerms = permissions.length;
    const totalModules = useMemo(() => [...new Set(permissions.map((p) => p.module || "Général"))].length, [permissions]);
    const totalAssignments = useMemo(() => Object.values(rolePermissionsMap).reduce((sum, arr) => sum + (arr?.length || 0), 0), [rolePermissionsMap]);

    return (
        <div className="flex h-[calc(100vh-120px)] flex-col gap-3">
            <header className="flex shrink-0 items-end justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <KeyRound size={14} className="text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                        <h1 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-white">Permissions</h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Gestion des autorisations par rôle</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <Info size={10} />
                    Lecture seule
                </div>
            </header>

            <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
                <StatCard icon={KeyRound} label="Permissions" value={totalPerms} sub="référentiel global" accent="bg-slate-900 dark:bg-white" />
                <StatCard icon={Shield} label="Rôles" value={roles.length} sub="profils d'accès" accent="bg-blue-600" />
                <StatCard icon={Layers} label="Modules" value={totalModules} sub="domaines fonctionnels" accent="bg-violet-600" />
                <StatCard icon={Link2} label="Assignations" value={totalAssignments} sub="liens rôle-permission" accent="bg-emerald-600" />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
                <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="shrink-0 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rôles</p>
                    </div>
                    <div className={`flex-1 overflow-y-auto ${SCROLLBAR_CLASSES}`}>
                        {loading ? (
                            <div className="space-y-1.5 p-2.5">
                                {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />)}
                            </div>
                        ) : (
                            (Array.isArray(roles) ? roles : []).map((role) => {
                                const style = getRoleStyle(role.nom_role);
                                const RoleIcon = style.icon || Shield;
                                const count = (rolePermissionsMap[role.id_role] || []).length;
                                const isSelected = role.id_role === selectedRoleId;
                                return (
                                    <button key={role.id_role} onClick={() => setSelectedRoleId(role.id_role)} className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition ${isSelected ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800/60" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                                            <RoleIcon size={13} className="text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[12px] font-semibold text-slate-900 dark:text-white">{role.nom_role}</p>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400">{style.label}</p>
                                        </div>
                                        <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[9px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-400">{count}</span>
                                        <ChevronRight size={12} className={`text-slate-400 transition ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    {selectedRole ? (
                        <>
                            <div className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                                            <SelectedRoleIcon size={15} className="text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">{selectedRole.nom_role}</h2>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{selectedRoleStyle?.label} · {selectedPerms.length} permission{selectedPerms.length !== 1 ? "s" : ""}</p>
                                        </div>
                                    </div>
                                    <div className="relative w-56">
                                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrer les permissions..." className="w-full rounded-md border border-slate-200 bg-white py-1 pl-7 pr-7 text-[11px] text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                                        {search && (
                                            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={`flex-1 overflow-y-auto p-4 ${SCROLLBAR_CLASSES}`}>
                                {filteredSelectedPerms.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                            <Search size={15} className="text-slate-400" />
                                        </div>
                                        <p className="text-[12px] font-medium text-slate-900 dark:text-white">{search ? "Aucun résultat" : "Aucune permission"}</p>
                                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                                            {search ? "Aucune permission ne correspond à votre recherche." : "Ce rôle n'a aucune permission assignée."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {Object.entries(permsByModule).map(([module, perms]: [string, any]) => {
                                            const safePerms = Array.isArray(perms) ? perms : [];
                                            const Icon = getModuleIcon(module);
                                            return (
                                                <div key={module}>
                                                    <div className="mb-1.5 flex items-center gap-1.5">
                                                        <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                                                            <Icon size={9} className="text-slate-600 dark:text-slate-400" />
                                                        </div>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{module}</span>
                                                        <span className="font-mono text-[9px] text-slate-400">{safePerms.length}</span>
                                                    </div>
                                                    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                                                        {safePerms.map((perm: any, idx: number) => (
                                                            <div key={perm.id_permission || idx} className={`flex items-start gap-2.5 bg-white px-3 py-2 dark:bg-slate-900 ${idx !== safePerms.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""}`}>
                                                                <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-emerald-500 text-white">
                                                                    <Check size={8} strokeWidth={3} />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{perm.nom_permission}</p>
                                                                    {perm.description && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{perm.description}</p>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-[11px] text-slate-400">Sélectionnez un rôle</p>
                        </div>
                    )}
                </section>
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                <div className="flex items-center gap-1">
                    <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-sm bg-emerald-500 text-white">
                        <Check size={7} strokeWidth={3} />
                    </span>
                    Permission accordée
                </div>
                <p className="font-mono">{roles.length} rôles · {totalPerms} permissions</p>
            </footer>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: number; sub: string; accent: string }) {
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