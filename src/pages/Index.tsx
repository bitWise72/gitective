import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
 import { GitBranch, Plus, Search, Clock, CheckCircle, AlertCircle, Loader2, Sparkles, LogOut } from 'lucide-react';
import { useEvents, useInvestigation } from '@/hooks/useInvestigation';
 import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/types/timeline';

const STATUS_CONFIG = {
  idle: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  collecting: { icon: Loader2, color: 'text-forge-cyan', bg: 'bg-forge-cyan/10' },
  analyzing: { icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10' },
  complete: { icon: CheckCircle, color: 'text-credibility-high', bg: 'bg-credibility-high/10' },
  error: { icon: AlertCircle, color: 'text-credibility-low', bg: 'bg-credibility-low/10' },
};

export default function Index() {
  const navigate = useNavigate();
  const { data: events = [], isLoading } = useEvents();
  const { createEvent } = useInvestigation(null);
   const { user, signOut } = useAuth();
  
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
   const handleSignOut = async () => {
     await signOut();
     navigate('/auth');
   };
 
  const handleCreateEvent = async () => {
    if (!title.trim()) return;
    
    setIsCreating(true);
    try {
      const event = await createEvent.mutateAsync({ title, description });
      setNewEventOpen(false);
      setTitle('');
      setDescription('');
      navigate(`/investigation/${event.id}`);
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        
        <div className="container relative py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 glow-primary">
                <GitBranch className="w-8 h-8 text-primary" />
              </div>
              <Badge variant="outline" className="text-primary border-primary/30">
                Powered by Gemini 3
              </Badge>
               <div className="ml-auto flex items-center gap-2">
                 <span className="text-sm text-muted-foreground">{user?.email}</span>
                 <Button variant="ghost" size="sm" onClick={handleSignOut}>
                   <LogOut className="w-4 h-4" />
                 </Button>
               </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              Timeline<span className="text-primary">Forge</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8">
              Git for Reality. Version control your investigation of contested events.
              <br />
              <span className="text-foreground/80">
                Track competing narratives, analyze evidence, and discover the truth.
              </span>
            </p>
            
            <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="glow-primary">
                  <Plus className="w-5 h-5 mr-2" />
                  Start New Investigation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Investigation</DialogTitle>
                  <DialogDescription>
                    Describe the event you want to investigate. The AI will help you collect evidence and identify competing narratives.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Event Title</label>
                    <Input
                      placeholder="e.g., 2020 Election Fraud Claims"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Describe the contested event in detail. Include key claims, dates, and context..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateEvent} 
                    className="w-full"
                    disabled={!title.trim() || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Begin Investigation
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        </div>
      </header>
      
      {/* Investigations List */}
      <main className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-foreground">Your Investigations</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search investigations..."
                className="pl-9 w-[250px]"
              />
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex p-4 rounded-full bg-secondary mb-4">
              <GitBranch className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No investigations yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your first investigation to begin tracking evidence and narratives.
            </p>
            <Button onClick={() => setNewEventOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Investigation
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </main>
      
      {/* Features Section */}
      <section className="border-t border-border bg-card/50">
        <div className="container py-16">
          <h2 className="text-2xl font-semibold text-center text-foreground mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="AI-Powered Research"
              description="Gemini 3 autonomously collects and analyzes evidence from across the web."
            />
            <FeatureCard
              icon={<GitBranch className="w-6 h-6" />}
              title="Narrative Branches"
              description="Track competing interpretations like Git branches, with confidence scores."
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Hypothesis Testing"
              description="Generate testable predictions and validate claims against evidence."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function EventCard({ event, index }: { event: Event; index: number }) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[event.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.idle;
  const StatusIcon = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="cursor-pointer evidence-card hover:border-primary/50"
        onClick={() => navigate(`/investigation/${event.id}`)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-1">{event.title}</CardTitle>
            <Badge className={`${config.bg} ${config.color} shrink-0`}>
              <StatusIcon className={`w-3 h-3 mr-1 ${event.status === 'collecting' || event.status === 'analyzing' ? 'animate-spin' : ''}`} />
              {event.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {event.description && (
            <CardDescription className="line-clamp-2 mb-3">
              {event.description}
            </CardDescription>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Phase {event.current_phase}/{event.total_phases}</span>
            <span>{new Date(event.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
