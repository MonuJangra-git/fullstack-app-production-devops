import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Zap, Shield, Layout, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/30 text-foreground overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 opacity-50 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-1/2 -left-[200px] w-[600px] h-[600px] bg-secondary/15 opacity-40 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 right-[10%] w-[800px] h-[400px] bg-accent/15 opacity-40 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <header className="container mx-auto px-4 h-20 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
            <img src="/logo.svg" alt="TaskFlow Logo" className="w-8 h-8 relative z-10" />
          </div>
          <span className="font-bold text-xl tracking-tight">TaskFlow</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#teams" className="hover:text-white transition-colors">For Teams</a>
          <a href="#personal" className="hover:text-white transition-colors">Personal</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/sign-up" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_0_15px_rgba(0,102,255,0.3)] hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(0,102,255,0.5)] transition-all">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center z-10 relative">
        <section className="container mx-auto px-4 pt-32 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium mb-8 text-primary backdrop-blur-md"
          >
            <Zap className="w-4 h-4" />
            <span>TaskFlow 2.0 is here</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 max-w-4xl mx-auto leading-tight"
          >
            Manage tasks with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">unprecedented precision.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            The mission control for your work. Seamlessly blend personal tracking with team collaboration in a high-performance workspace.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/sign-up" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow-[0_0_20px_rgba(0,102,255,0.4)] hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all gap-2 w-full sm:w-auto">
              Start Building <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/sign-in" className="inline-flex h-12 items-center justify-center rounded-md bg-white/5 border border-white/10 backdrop-blur-md px-8 text-base font-medium text-white hover:bg-white/10 transition-all w-full sm:w-auto">
              Open App
            </Link>
          </motion.div>
        </section>

        <section id="features" className="container mx-auto px-4 py-24">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Team & Personal", desc: "Keep private tasks private while collaborating in shared team workspaces.", icon: Shield, color: "text-primary" },
              { title: "Visual Boards", desc: "Drag, drop, and visualize your workflow with lightning-fast project boards.", icon: Layout, color: "text-secondary" },
              { title: "Real-time Activity", desc: "Never miss a beat with unified activity feeds across all your projects.", icon: Activity, color: "text-accent" },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-2xl glass-panel relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <feature.icon className={`w-10 h-10 mb-4 ${feature.color} opacity-80`} />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Dashboard Preview */}
        <section className="container mx-auto px-4 py-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-5xl mx-auto rounded-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="h-12 bg-card border-b border-white/5 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <div className="w-3 h-3 rounded-full bg-white/20" />
            </div>
            <div className="grid grid-cols-4 bg-background h-[400px]">
              <div className="col-span-1 border-r border-white/5 p-4 flex flex-col gap-4">
                <div className="h-8 bg-white/5 rounded w-3/4" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
                <div className="h-4 bg-white/5 rounded w-2/3" />
              </div>
              <div className="col-span-3 p-8 flex flex-col gap-6">
                <div className="h-10 bg-white/5 rounded w-1/3" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-32 bg-white/5 rounded-xl border border-white/5" />
                  <div className="h-32 bg-white/5 rounded-xl border border-white/5" />
                  <div className="h-32 bg-white/5 rounded-xl border border-white/5" />
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      
      <footer className="border-t border-white/10 py-12 mt-20 relative z-10">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm flex flex-col items-center gap-4">
          <div className="w-8 h-8 relative flex items-center justify-center grayscale opacity-50">
            <img src="/logo.svg" alt="TaskFlow" className="w-6 h-6" />
          </div>
          <p>© {new Date().getFullYear()} TaskFlow. Crafted with precision.</p>
        </div>
      </footer>
    </div>
  );
}