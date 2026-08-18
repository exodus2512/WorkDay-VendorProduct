'use client';
import React, { useState, useEffect } from 'react';
import { Button, Input } from './components/UI';
import { ArrowRight, CheckCircle2, Building2, Users, Shield, Zap, TrendingUp, DollarSign } from 'lucide-react';

export default function LandingPage({ onLoginClick, onSignupSuccess }) {
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    userName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle scroll for sticky nav styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Success! Auto-login
      if (onSignupSuccess) {
        onSignupSuccess(data.token, data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 scroll-smooth selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden">
      
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">WorkForce Vendor</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden md:block transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden md:block transition-colors">Pricing</a>
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            <button onClick={onLoginClick} className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">Log In</button>
            <Button variant="primary" onClick={() => document.getElementById('signup').scrollIntoView()}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-blue-100/50 to-transparent rounded-[100%] blur-3xl -z-10 opacity-70" />
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -z-10" />
        <div className="absolute top-40 -left-20 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-8 animate-fade-in-up">
            <Zap className="w-3.5 h-3.5" />
            <span>The #1 Multi-Tenant Vendor OS</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-[1.1]">
            Scale Your Agency.<br className="hidden md:block"/> Manage Clients <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Effortlessly.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            The all-in-one operating system for staffing agencies, dev shops, and consultancy firms. Manage multi-tenant clients, projects, timesheets, and contractor payrolls in one secure workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto text-base px-8 py-4 shadow-lg shadow-blue-500/20" onClick={() => document.getElementById('signup').scrollIntoView()}>
              Start Your Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base px-8 py-4 bg-white hover:bg-slate-50">
              Book a Demo
            </Button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-slate-400 text-sm font-medium">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> No credit card required</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 14-day free trial</div>
            <div className="flex items-center gap-2 hidden sm:flex"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Cancel anytime</div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you need to run your firm</h2>
            <p className="text-slate-500 text-lg">Powerful features wrapped in an intuitive, consumer-grade interface.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">True Multi-Tenant Security</h3>
              <p className="text-slate-600 leading-relaxed">
                Total data isolation between your clients. Onboard infinite client organizations securely under one Vendor roof. Clients only ever see their own projects.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Client-Driven PM Assignment</h3>
              <p className="text-slate-600 leading-relaxed">
                Empower your clients. They submit project requirements and directly assign Project Managers from your talent pool during the creation flow.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-xl hover:shadow-sky-900/5 transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Automated Payrolls</h3>
              <p className="text-slate-600 leading-relaxed">
                When a milestone is approved, the system automatically calculates contractor timesheets against their rate card and generates accurate payroll entries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Policies */}
      <section id="pricing" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Simple, transparent pricing</h2>
            <p className="text-slate-400 text-lg">Pay only for the active workforce you manage. Clients are always free.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700">
              <h3 className="text-xl font-medium text-slate-300 mb-2">Starter Boutique</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Up to 10 Contractors</li>
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Unlimited Clients</li>
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Basic Timesheets</li>
              </ul>
              <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 border-none text-white" onClick={() => document.getElementById('signup').scrollIntoView()}>Choose Starter</Button>
            </div>
            
            {/* Pro */}
            <div className="bg-gradient-to-b from-blue-600 to-indigo-700 rounded-3xl p-8 border border-blue-500 relative transform md:-translate-y-4 shadow-2xl shadow-blue-900/50">
              <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-medium text-blue-100 mb-2">Growth Agency</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">$299</span>
                <span className="text-blue-200">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-white"><CheckCircle2 className="w-5 h-5 text-blue-200" /> Up to 50 Contractors</li>
                <li className="flex items-center gap-3 text-white"><CheckCircle2 className="w-5 h-5 text-blue-200" /> Advanced Payroll Automation</li>
                <li className="flex items-center gap-3 text-white"><CheckCircle2 className="w-5 h-5 text-blue-200" /> Priority Support</li>
              </ul>
              <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 border-none" onClick={() => document.getElementById('signup').scrollIntoView()}>Choose Growth</Button>
            </div>

            {/* Enterprise */}
            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700">
              <h3 className="text-xl font-medium text-slate-300 mb-2">Enterprise</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Unlimited Contractors</li>
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Dedicated Account Manager</li>
                <li className="flex items-center gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Custom API Access</li>
              </ul>
              <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 border-none text-white" onClick={() => document.getElementById('signup').scrollIntoView()}>Contact Sales</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Signup Form Section */}
      <section id="signup" className="py-24 bg-white">
        <div className="max-w-xl mx-auto px-6">
          <div className="bg-slate-50 p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Create your Vendor Workspace</h2>
              <p className="text-slate-500 mt-2">Get started with a 14-day free trial.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <Input 
                  name="companyName" 
                  value={formData.companyName} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Acme Agency Inc." 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Full Name</label>
                <Input 
                  name="userName" 
                  value={formData.userName} 
                  onChange={handleInputChange} 
                  placeholder="John Doe" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Work Email</label>
                <Input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  placeholder="john@acme.com" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <Input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  placeholder="Create a strong password" 
                  required 
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full py-3 mt-4" disabled={loading}>
                {loading ? 'Creating workspace...' : 'Create Account'}
              </Button>
            </form>
            
            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account? <button onClick={onLoginClick} className="text-blue-600 font-medium hover:underline">Log in</button>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p>© 2026 WorkForce Vendor Product. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
