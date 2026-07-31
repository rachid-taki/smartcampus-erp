import WelcomeHeader from '../../../components/student/dashboard/WelcomeHeader';
import StatCard from '../../../components/student/dashboard/StatCard';
import QuickActions from '../../../components/student/dashboard/QuickActions';
import RecentRequestsTable from '../../../components/student/dashboard/RecentRequestsTable';
import RecentNotifications from '../../../components/student/dashboard/RecentNotifications';
import RequestsOverviewChart from '../../../components/student/dashboard/RequestsOverviewChart';
import SemesterProgress from '../../../components/student/dashboard/SemesterProgress';
import MiniCalendar from '../../../components/student/calendar/MiniCalendar';
import { studentRequests, notifications, calendarEvents, studentDocuments, currentStudent, universityAnnouncements } from '../../../data/dummyData';
import type { StatCardData } from '../../../types';
import StudentInfoCard from '../../../components/student/dashboard/StudentInfoCard';
import RecentDocuments from '../../../components/student/dashboard/RecentDocuments';
import UniversityAnnouncements from '../../../components/student/dashboard/UniversityAnnouncements';


const inProgress = studentRequests.filter((r) => r.status === 'En cours' || r.status === 'En attente').length;
const validated = studentRequests.filter((r) => r.status === 'Validée').length;
const unread = notifications.filter((n) => !n.read).length;

const stats: (StatCardData & { accent: 'blue' | 'sky' | 'indigo' | 'cyan' })[] = [
  {
    id: 'stat-pending',
    title: 'Demandes en cours',
    value: inProgress,
    description: 'En attente de traitement',
    icon: 'Clock',
    accent: 'sky',
    sparkline: [3, 4, 2, 5, 3, 4, inProgress],
  },
  {
    id: 'stat-validated',
    title: 'Demandes validées',
    value: validated,
    description: 'Traitées avec succès',
    icon: 'CheckCircle2',
    accent: 'blue',
    trend: { value: 12, direction: 'up' },
    sparkline: [1, 2, 2, 3, 3, 4, validated],
  },
  {
    id: 'stat-documents',
    title: 'Documents déposés',
    value: studentDocuments.length,
    description: 'Dans votre espace documents',
    icon: 'FolderOpen',
    accent: 'indigo',
    sparkline: [1, 1, 2, 2, 2, 3, studentDocuments.length],
  },
  {
    id: 'stat-notifications',
    title: 'Notifications',
    value: unread,
    description: 'Non lues',
    icon: 'Bell',
    accent: 'cyan',
    sparkline: [4, 3, 5, 2, 3, 1, unread],
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <WelcomeHeader />
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
    <StudentInfoCard />
     <UniversityAnnouncements announcements={universityAnnouncements} />
  </div>


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} accent={stat.accent} index={i} />
        ))}
      </div>

      <QuickActions />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-6 xl:col-span-2">
            <RecentRequestsTable requests={studentRequests.slice(0, 5)} />
            </div>
            <MiniCalendar events={calendarEvents} />
            <RecentDocuments />
           
           
            <div className="space-y-6 xl:col-span-1"> 
                    <RequestsOverviewChart requests={studentRequests} />
                    <SemesterProgress />
            </div>
             <RecentNotifications items={notifications} />
             {/* <UniversityAnnouncements announcements={universityAnnouncements} /> */}
        </div>
    </div>
  );
}
