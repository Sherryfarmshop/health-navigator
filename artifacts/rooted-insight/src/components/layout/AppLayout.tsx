import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Pill, LayoutDashboard, Menu, X, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImg from "@assets/191D941A-F70C-45AA-9730-6C4A7B02E94E_1774658820097.png";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Lab Results", path: "/lab-results", icon: Activity },
    { name: "Medications", path: "/medications", icon: Pill },
  ];

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full font-sans">
      
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Rooted Insight Logo" className="w-8 h-8 rounded-md" />
          <span className="font-display text-xl text-primary">Rooted Insight</span>
        </div>
        <button onClick={toggleMenu} className="p-2 text-foreground">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar (Desktop) & Mobile Drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-border transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3 hidden md:flex">
          <div className="bg-primary/10 p-2 rounded-xl">
            <img src={logoImg} alt="Rooted Insight Logo" className="w-8 h-8 object-cover rounded shadow-sm" />
          </div>
          <span className="font-display text-2xl text-primary tracking-tight">Rooted Insight</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 md:py-0 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-secondary/50 rounded-2xl p-4 border border-secondary">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Leaf className="w-4 h-4" />
              <span className="font-semibold text-sm">Wellness Tip</span>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed">
              Spending 20 minutes in nature can significantly lower stress hormone levels.
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#F9F9F7]">
        <div className="max-w-5xl mx-auto p-4 md:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
