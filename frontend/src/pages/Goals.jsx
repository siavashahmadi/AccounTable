import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

const Goals = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Goals</h1>
        <Link to="/goals/new">
          <Button>Create New Goal</Button>
        </Link>
      </div>
      
      <div className="border rounded-md p-12 flex items-center justify-center flex-col gap-4">
        <h2 className="text-xl font-semibold">Goals Feature Coming Soon</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This section will allow you to create, track, and manage your accountability goals.
        </p>
      </div>
    </div>
  );
};

export default Goals; 