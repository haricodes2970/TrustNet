import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from './Logo';

export const Navbar = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full bg-trust-paper border-b border-trust-ink/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Exact Brand Logo matching image */}
        <Logo size="md" />

        {/* Public Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-trust-slate">
          <Link to="/" className="hover:text-trust-verified transition-colors">Features</Link>
          <a href="#how-it-works" className="hover:text-trust-verified transition-colors">How It Works</a>
          <a href="#showcase" className="hover:text-trust-verified transition-colors">Startups</a>
          <a href="#investors" className="hover:text-trust-verified transition-colors">Investors</a>
          <Link to="/pricing" className="hover:text-trust-verified transition-colors">Pricing</Link>
        </nav>

        {/* Auth CTAs */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
          >
            Log In
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/signup')}
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
