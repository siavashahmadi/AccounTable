import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

const Partnerships = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Partnerships</h1>
        <Link to="/partnerships/new">
          <Button>Find a Partner</Button>
        </Link>
      </div>
      
      <div className="border rounded-md p-12 flex items-center justify-center flex-col gap-4">
        <h2 className="text-xl font-semibold">Partnerships Feature Coming Soon</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This section will allow you to find, connect with, and manage your accountability partnerships.
        </p>
      </div>
    </div>
  );
};

export default Partnerships; 