import WelcomeHeader from '../../../components/student/dashboard/WelcomeHeader';
import StatCard from '../../../components/student/dashboard/StatCard';
import QuickActions from '../../../components/student/dashboard/QuickActions';
import RecentRequestsTable from '../../../components/student/dashboard/RecentRequestsTable';
import RecentNotifications from '../../../components/student/dashboard/RecentNotifications';
import RequestsOverviewChart from '../../../components/student/dashboard/RequestsOverviewChart';
import SemesterProgress from '../../../components/student/dashboard/SemesterProgress';
import MiniCalendar from '../../../components/student/calendar/MiniCalendar';
import type { StatCardData } from '../../../types';
import StudentInfoCard from '../../../components/student/dashboard/StudentInfoCard';
import RecentDocuments from '../../../components/student/dashboard/RecentDocuments';
import { useEffect, useState } from "react";
import {
  getRecentRequests,
  getRecentDocuments,
  getNotifications,
} from "../../../services/student.service";
import ReclamationBanner from '../../../components/student/dashboard/ReclamationBanner';


export default function Dashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [req, docs, notifs] = await Promise.all([
          getRecentRequests(),
          getRecentDocuments(),
          getNotifications(),
        ]);
        setRequests(req);
        setDocuments(docs);
        setNotifications(notifs);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);
  

  const inProgress = requests.filter((r: any) =>
    ["Soumise", "En_Traitement"].includes(r.status)
  ).length;
  const validated = requests.filter(
    (r: any) => r.status === "Validee"
  ).length;
  const validationRate =
    requests.length === 0
      ? 0
      : Math.round((validated / requests.length) * 100);
  const unread = notifications.filter((n: any) => !n.read).length;

  const stats: (StatCardData & {
    accent: "blue" | "sky" | "indigo" | "cyan";
  })[] = [
    {
      id: "stat-pending",
      title: "Demandes en cours",
      value: inProgress,
      description: "En attente de traitement",
      icon: "Clock",
      accent: "sky",
      sparkline: [3, 4, 2, 5, 3, 4, inProgress],
    },
    {
      id: "stat-validated",
      title: "Demandes validées",
      value: validated,
      description: "Traitées avec succès",
      icon: "CheckCircle2",
      accent: "blue",
      trend: { value: validationRate, direction: "up" },
      sparkline: [1, 2, 2, 3, 3, 4, validated],
    },
    {
      id: "stat-documents",
      title: "Documents déposés",
      value: documents.length,
      description: "Dans votre espace documents",
      icon: "FolderOpen",
      accent: "indigo",
      sparkline: [1, 1, 2, 2, 2, 3, documents.length],
    },
    {
      id: "stat-notifications",
      title: "Notifications",
      value: unread,
      description: "Non lues",
      icon: "Bell",
      accent: "cyan",
      sparkline: [4, 3, 5, 2, 3, 1, unread],
    },
  ];
  

 return (
    <div className="space-y-4">
        <WelcomeHeader />
        
        <ReclamationBanner />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
                <StudentInfoCard />
            </div>
            <SemesterProgress />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, i) => (
                <StatCard key={stat.id} data={stat} accent={stat.accent} index={i} />
            ))}
        </div>

        <QuickActions />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
                <RecentRequestsTable requests={requests} />
                <RecentDocuments />
            </div>
            <div className="space-y-4">
                <RequestsOverviewChart requests={requests} />
                <RecentNotifications />
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <MiniCalendar />
        </div>
    </div>
  );
}