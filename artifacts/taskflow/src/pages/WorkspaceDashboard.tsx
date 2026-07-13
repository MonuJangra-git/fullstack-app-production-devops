import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetWorkspace, 
  useGetWorkspaceSummary, 
  useGetWorkspaceActivity,
  useListProjects,
  useCreateProject,
  getGetWorkspaceSummaryQueryKey,
  getListProjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Activity, 
  LayoutGrid,
  ListTodo
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function WorkspaceDashboard() {
  const { workspaceId: wsIdStr } = useParams();
  const workspaceId = Number(wsIdStr);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspace, isLoading: wsLoading } = useGetWorkspace(workspaceId);
  const { data: summary, isLoading: sumLoading } = useGetWorkspaceSummary(workspaceId);
  const { data: activities, isLoading: actLoading } = useGetWorkspaceActivity(workspaceId);
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

  const isLoading = wsLoading || sumLoading || actLoading || projLoading;

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!workspace || !summary) return <div className="p-8">Workspace not found</div>;

  const chartData = summary.projectBreakdown.map(p => ({
    name: p.projectName,
    total: p.taskCount,
    done: p.doneCount,
    color: p.color
  }));

  const statCards = [
    { title: "Total Tasks", value: summary.totalTasks, icon: ListTodo, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Done", value: summary.doneCount, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "In Progress", value: summary.inProgressCount, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Overdue", value: summary.overdueCount, icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{workspace.name} Dashboard</h1>
          <p className="text-muted-foreground">Overview of all projects and tasks.</p>
        </div>
        <Button onClick={() => setIsCreateProjOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-panel overflow-hidden relative">
              <div className={`absolute top-0 right-0 p-4 opacity-20`}>
                <stat.icon className={`w-16 h-16 ${stat.color} -mr-4 -mt-4`} />
              </div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-md ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                </div>
                <div className="text-4xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Chart/List */}
        <Card className="lg:col-span-2 glass-panel flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary" /> Active Projects
              </CardTitle>
              <CardDescription>Task completion by project</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/projects`}>View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-4">
            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#13151A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="total" name="Total Tasks" fill="#333" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="done" name="Completed" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#0066FF'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <LayoutGrid className="w-12 h-12 mb-2 opacity-20" />
                <p>No projects to display.</p>
              </div>
            )}
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects?.slice(0, 4).map(proj => (
                <Link key={proj.id} href={`/workspaces/${workspaceId}/projects/${proj.id}`}>
                  <div className="group flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors cursor-pointer">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: proj.color }} />
                    <div className="flex-1 truncate">
                      <div className="font-medium text-sm group-hover:text-primary transition-colors">{proj.name}</div>
                      <div className="text-xs text-muted-foreground">{proj.taskCount} tasks</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="glass-panel flex flex-col h-[500px]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-secondary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2 pb-6 space-y-6">
            {activities?.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">No recent activity</div>
            ) : (
              activities?.map((act) => (
                <div key={act.id} className="relative pl-6">
                  {/* Timeline dot & line */}
                  <div className="absolute left-0 top-1.5 bottom-[-24px] w-px bg-white/10 last:bg-transparent" />
                  <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
                  
                  <div className="text-sm">
                    <span className="font-medium text-white">{act.actorId ? 'User' : 'Someone'} </span>
                    <span className="text-muted-foreground">
                      {act.type === 'task_created' && 'created task '}
                      {act.type === 'task_completed' && 'completed task '}
                      {act.type === 'task_updated' && 'updated task '}
                      {act.type === 'task_deleted' && 'deleted a task'}
                      {act.type === 'project_created' && 'created project '}
                    </span>
                    <span className="font-medium text-white">{act.title}</span>
                    {act.projectName && (
                      <span className="text-muted-foreground"> in {act.projectName}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

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