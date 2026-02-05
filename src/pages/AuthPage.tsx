 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { motion } from 'framer-motion';
 import { GitBranch, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { useToast } from '@/hooks/use-toast';
 
 export default function AuthPage() {
   const navigate = useNavigate();
   const { toast } = useToast();
   const [isLoading, setIsLoading] = useState(false);
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
 
   const handleSignUp = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!email || !password) return;
     
     setIsLoading(true);
     try {
       const { error } = await supabase.auth.signUp({
         email,
         password,
       });
       
       if (error) throw error;
       
       toast({
         title: 'Check your email',
         description: 'We sent you a confirmation link to verify your account.',
       });
     } catch (error: any) {
       toast({
         title: 'Sign up failed',
         description: error.message,
         variant: 'destructive',
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleSignIn = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!email || !password) return;
     
     setIsLoading(true);
     try {
       const { error } = await supabase.auth.signInWithPassword({
         email,
         password,
       });
       
       if (error) throw error;
       
       navigate('/');
     } catch (error: any) {
       toast({
         title: 'Sign in failed',
         description: error.message,
         variant: 'destructive',
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   return (
     <div className="min-h-screen bg-background flex items-center justify-center p-4">
       <div className="absolute inset-0 grid-pattern opacity-30" />
       <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
       
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="relative w-full max-w-md"
       >
         <div className="flex items-center justify-center gap-3 mb-8">
           <div className="p-2 rounded-lg bg-primary/10 glow-primary">
             <GitBranch className="w-8 h-8 text-primary" />
           </div>
           <h1 className="text-3xl font-bold text-foreground">
             Timeline<span className="text-primary">Forge</span>
           </h1>
         </div>
         
         <Card className="border-border/50 bg-card/80 backdrop-blur">
           <CardHeader className="text-center">
             <CardTitle>Welcome</CardTitle>
             <CardDescription>
               Sign in to start investigating contested events
             </CardDescription>
           </CardHeader>
           <CardContent>
             <Tabs defaultValue="signin" className="w-full">
               <TabsList className="grid w-full grid-cols-2 mb-6">
                 <TabsTrigger value="signin">Sign In</TabsTrigger>
                 <TabsTrigger value="signup">Sign Up</TabsTrigger>
               </TabsList>
               
               <TabsContent value="signin">
                 <form onSubmit={handleSignIn} className="space-y-4">
                   <div className="space-y-2">
                     <div className="relative">
                       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                       <Input
                         type="email"
                         placeholder="Email"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         className="pl-10"
                         required
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <div className="relative">
                       <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                       <Input
                         type="password"
                         placeholder="Password"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="pl-10"
                         required
                       />
                     </div>
                   </div>
                   <Button type="submit" className="w-full" disabled={isLoading}>
                     {isLoading ? (
                       <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                       <>
                         Sign In
                         <ArrowRight className="w-4 h-4 ml-2" />
                       </>
                     )}
                   </Button>
                 </form>
               </TabsContent>
               
               <TabsContent value="signup">
                 <form onSubmit={handleSignUp} className="space-y-4">
                   <div className="space-y-2">
                     <div className="relative">
                       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                       <Input
                         type="email"
                         placeholder="Email"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         className="pl-10"
                         required
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <div className="relative">
                       <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                       <Input
                         type="password"
                         placeholder="Password (min 6 characters)"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="pl-10"
                         minLength={6}
                         required
                       />
                     </div>
                   </div>
                   <Button type="submit" className="w-full" disabled={isLoading}>
                     {isLoading ? (
                       <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                       <>
                         Create Account
                         <ArrowRight className="w-4 h-4 ml-2" />
                       </>
                     )}
                   </Button>
                 </form>
               </TabsContent>
             </Tabs>
           </CardContent>
         </Card>
       </motion.div>
     </div>
   );
 }