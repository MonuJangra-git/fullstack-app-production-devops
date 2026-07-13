import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetWorkspace, 
  useListProjects,
  useCreateProject,
  getListProjectsQueryKey,
  getGetWorkspaceSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Clock } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function WorkspaceProjects() {
  const { workspaceId: wsIdStr } = useParams();
  const workspaceId = Number(wsIdStr);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspace, isLoading: wsLoading } = useGetWorkspace(workspaceId);
  const { data: projects, isLoading: projLoading } = useListProjects(workspaceId);
  const createProject = useCreateProject();

  const [isCreateProjOpen, setIsCreateProjOpen] = useState(false);
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projColor, setProjColor] = useState("#0066FF");

  const handleCreateProject = () => {
    if (!projName.trim()) return;
    createProject.mutate(
      { workspaceId, data: { name: projName, description: projDesc, color: projColor } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey(workspaceId) });
          queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey(workspaceId) });
          toast({ title: "Project created", description: "Your new project is ready." });
          setIsCreateProjOpen(false);
          setProjName("");
          setProjDesc("");
        },
        onError: () => toast({ title: "Error", description: "Failed to create project", variant: "destructive" })
      }
    );
  };

  if (wsLoading || projLoading) return <div className="p-8"><Skeleton className="h-10 w-64 mb-8" /><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Skeleton className="h-48 rounded-xl"/><Skeleton className="h-48 rounded-xl"/><Skeleton className="h-48 rounded-xl"/></div></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Projects</h1>
          <p className="text-muted-foreground">Manage projects in {workspace?.name}.</p>
        </div>
        <Button onClick={() => setIsCreateProjOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {projects?.length === 0 ? (
        <div className="text-center py-24 glass-panel rounded-2xl border border-white/5 border-dashed">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Projects organize your tasks into distinct workspaces.
          </p>
          <Button onClick={() => setIsCreateProjOpen(true)}>Create Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((proj, i) => (
            <motion.div key={proj.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/workspaces/${workspaceId}/projects/${proj.id}`}>
                <Card className="h-full glass-panel hover:bg-white/[0.04] transition-colors cursor-pointer group border-white/[0.05] hover:border-white/20">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: proj.color }} />
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">{proj.name}</CardTitle>
                    </div>
                    {proj.description && <p className="text-sm text-muted-foreground line-clamp-2">{proj.description}</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm mt-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Tasks</span>
                        <span className="font-semibold text-white">{proj.taskCount}</span>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Completed</span>
                        <span className="font-semibold text-emerald-400">{proj.doneCount}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-6 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Created {format(new Date(proj.createdAt), "MMM d, yyyy")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={isCreateProjOpen} onOpenChange={setIsCreateProjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={projName} onChange={e => setProjName(e.target.value)} placeholder="e.g. Q3 Roadmap" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Optional details..." />
            </div>
            <div className="space-y-2">
              <Label>Color Identity</Label>
              <div className="flex gap-2">
                {['#0066FF', '#00D4FF', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'].map(c => (
                  <button
                    key={c}
                    onClick={() => setProjColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${projColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateProjOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!projName.trim() || createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}