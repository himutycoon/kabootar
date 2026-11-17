import DesktopDashboard from './desktop/DesktopDashboard';
import MobileHome from './mobile/MobileHome';
import { useDesktopWeb } from '../hooks/useDesktopWeb';

// Desktop browsers get the desktop dashboard; the Android app and phone
// browsers get the mobile home screen.
export default function Dashboard() {
  const isDesktopWeb = useDesktopWeb();
  return isDesktopWeb ? <DesktopDashboard /> : <MobileHome />;
}
