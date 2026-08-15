export default function Footer() {
  return (
    <footer className="border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6">
      <div className="flex flex-col items-center justify-between gap-1.5 text-[11px] text-slate-400 sm:flex-row">
        <p>© {new Date().getFullYear()} SmartCampus ERP — Tous droits réservés.</p>
        <div className="flex items-center gap-3">
          <a href="#" className="hover:text-primary-600">
            Aide
          </a>
          <a href="#" className="hover:text-primary-600">
            Confidentialité
          </a>
          <a href="#" className="hover:text-primary-600">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}