import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold">AccounTable</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button variant="default">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button variant="default">Sign Up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Achieve Your Goals with <span className="text-primary">Accountability</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-muted-foreground max-w-2xl mx-auto">
            Connect with an accountability partner and turn your aspirations into achievements through mutual support and commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="px-8">Get Started</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="px-8">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 px-4 bg-accent/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-primary text-xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Partner Up</h3>
              <p className="text-center text-muted-foreground">
                Find an accountability partner who shares similar goals or interests.
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-primary text-xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Set Clear Goals</h3>
              <p className="text-center text-muted-foreground">
                Define specific, measurable goals with actionable steps and deadlines.
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-primary text-xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Stay Accountable</h3>
              <p className="text-center text-muted-foreground">
                Regular check-ins, progress tracking, and mutual support to ensure success.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-6">Ready to achieve your goals?</h2>
          <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            Join AccounTable today and transform the way you approach your goals.
          </p>
          <Link to="/register">
            <Button size="lg" className="px-8">Get Started Now</Button>
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">© 2023 AccounTable</span>
            <div className="space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 