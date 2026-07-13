import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListWorkspaces, useCreateWorkspace, getListWorkspacesQueryKey } from "@workspace/api-client-react";
import { UserButton } from "@clerk/react";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  Users, 
  Plus, 
  FolderKanban, 
  CheckSquare, 
  MoreHorizontal,
  ChevronRight,
  LogOut
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Workspaces() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: workspaces, isLoading } = useListWorkspaces();
  const createWorkspace = useCreateWorkspace();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"personal" | "team">("team");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createWorkspace.mutate(
      { data: { name: newName, type: newType } },
      {
        onSuccess: (ws) => {
          queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
          toast({ title: "Workspace created", description: `Welcome to ${ws.name}` });
          setIsCreateOpen(false);
          setLocation(`/workspaces/${ws.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create workspace", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden text-foreground">
      {/* Background FX */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="h-16 border-b border-white/[0.05] flex items-center justify-between px-6 z-10 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
            <img src="/logo.svg" alt="TaskFlow" className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">TaskFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <UserButton 
            appearance={{ 
              elements: { userButtonAvatarBox: "w-8 h-8 border border-white/10" } 
            }} 
          />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto max-w-6xl px-6 py-12 z-10">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Your Workspaces</h1>
            <p className="text-muted-foreground">Select a workspace or create a new one to start collaborating.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Workspace
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-48 flex flex-col">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex gap-4 mt-4">
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : workspaces?.length === 0 ? (
          <div className="text-center py-24 glass-panel rounded-2xl border border-white/5 border-dashed">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No workspaces found</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You don't belong to any workspaces yet. Create your first workspace to start organizing your projects.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>Create Workspace</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces?.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link href={`/workspaces/${ws.id}`}>
                  <Card className="h-full hover-elevate cursor-pointer transition-all hover:border-primary/30 group bg-card/40 hover:bg-card/80">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-white/5 text-primary group-hover:bg-primary/20 transition-colors">
                          {ws.type === 'team' ? <Users className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                        </div>
                        <Badge variant="outline" className="bg-background/50 capitalize text-[10px]">
                          {ws.role}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">{ws.name}</CardTitle>
                      <div className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                        {ws.type} Workspace
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <FolderKanban className="w-4 h-4" />
                          <span>{ws.projectCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CheckSquare className="w-4 h-4" />
                          <span>{ws.taskCount}</span>
                        </div>
                        {ws.type === 'team' && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{ws.memberCount}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <div className="px-6 pb-6 pt-0 mt-auto flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 transform duration-300">
                      Enter Workspace <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Set up a new space for your projects and tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Workspace Name</Label>
              <Input 
                placeholder="e.g. Engineering, Personal, Marketing" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={(val: any) => setNewType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal (Private)</SelectItem>
                  <SelectItem value="team">Team (Collaborative)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createWorkspace.isPending}>
              {createWorkspace.isPending ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}