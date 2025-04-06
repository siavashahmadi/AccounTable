import { NavLink } from 'react-router-dom';
import { Home, Users, Target, Calendar, MessageSquare, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Partnerships', path: '/partnerships', icon: Users },
  { name: 'Goals', path: '/goals', icon: Target },
  { name: 'Check-ins', path: '/checkins', icon: Calendar },
  { name: 'Messages', path: '/messages', icon: MessageSquare },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="w-64 border-r min-h-[calc(100vh-4rem)] p-4 hidden md:block">
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar; 