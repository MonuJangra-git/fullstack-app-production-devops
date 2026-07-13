import { useState } from "react";
import { useParams } from "wouter";
import { 
  useListWorkspaceTasks, 
  useGetProject, 
  useCreateTask, 
  useUpdateTask, 
  useDeleteTask,
  getListWorkspaceTasksQueryKey,
  getGetWorkspaceSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Plus, MoreHorizontal, Calendar, AlignLeft, Trash2, Edit2, Clock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ['todo', 'in_progress', 'done'] as const;
const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };
const PRIORITY_COLORS = { low: "bg-slate-500/20 text-slate-400", medium: "bg-blue-500/20 text-blue-400", high: "bg-amber-500/20 text-amber-400", urgent: "bg-rose-500/20 text-rose-400" };

export default function ProjectBoard() {
  const { workspaceId: wsIdStr, projectId: projIdStr } = useParams();
  const workspaceId = Number(wsIdStr);
  const projectId = Number(projIdStr);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading: projLoading } = useGetProject(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useListWorkspaceTasks(workspaceId, { projectId });
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  // Form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus, setTaskStatus] = useState<"todo"|"in_progress"|"done">("todo");
  const [taskPriority, setTaskPriority] = useState<"low"|"medium"|"high"|"urgent">("medium");

  const resetForm = () => {
    setTaskTitle("");
    setTaskDesc("");
    setTaskStatus("todo");
    setTaskPriority("medium");
    setEditingTask(null);
  };

  const openCreate = (status: "todo"|"in_progress"|"done" = "todo") => {
    resetForm();
    setTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  const openEdit = (task: any) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setIsTaskModalOpen(true);
  };

  const handleSave = () => {
    if (!taskTitle.trim()) return;

    if (editingTask) {
      updateTask.mutate({ 
        taskId: editingTask.id, 
        data: { title: taskTitle, description: taskDesc, status: taskStatus, priority: taskPriority }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkspaceTasksQueryKey(workspaceId) });
          toast({ title: "Task updated" });
          setIsTaskModalOpen(false);
        }
      });
    } else {
      createTask.mutate({
        data: { projectId, title: taskTitle, description: taskDesc, status: taskStatus, priority: taskPriority }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkspaceTasksQueryKey(workspaceId) });
          queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey(workspaceId) });
          toast({ title: "Task created" });
          setIsTaskModalOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if(!confirm("Are you sure?")) return;
    deleteTask.mutate({ taskId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWorkspaceTasksQueryKey(workspaceId) });
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey(workspaceId) });
        toast({ title: "Task deleted" });
      }
    });
  };

  const moveToStatus = (taskId: number, newStatus: "todo"|"in_progress"|"done") => {
    const previousTasks = queryClient.getQueryData(getListWorkspaceTasksQueryKey(workspaceId));
    queryClient.setQueryData(getListWorkspaceTasksQueryKey(workspaceId), (old: any) => {
      if(!old) return old;
      return old.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t);
    });

    updateTask.mutate({ taskId, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey(workspaceId) }),
      onError: () => queryClient.setQueryData(getListWorkspaceTasksQueryKey(workspaceId), previousTasks)
    });
  };

  if (projLoading || tasksLoading) return <div className="p-8"><Skeleton className="h-10 w-48 mb-8" /><div className="grid grid-cols-3 gap-6"><Skeleton className="h-[500px]"/><Skeleton className="h-[500px]"/><Skeleton className="h-[500px]"/></div></div>;
  if (!project) return <div className="p-8">Project not found</div>;

  return (
    <div className="h-full flex flex-col p-8 pt-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
          </div>
        </div>
        <Button onClick={() => openCreate("todo")} className="gap-2">
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {STATUSES.map(status => {
          const colTasks = tasks.filter(t => t.status === status);
          return (
            <div key={status} className="flex flex-col w-[350px] min-w-[350px] bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden glass-panel">
              <div className="p-4 border-b border-white/[0.05] flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{STATUS_LABELS[status]}</h3>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{colTasks.length}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => openCreate(status)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                <AnimatePresence>
                  {colTasks.map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card className="p-4 cursor-pointer group bg-card hover:bg-card/80 transition-colors border-white/5 shadow-sm hover:shadow-md hover:border-white/10" onClick={() => openEdit(task)}>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className={`text-[10px] uppercase border-transparent ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}>
                            {task.priority}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(task); }}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <ArrowRight className="w-4 h-4 mr-2" /> Move to
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                    {STATUSES.filter(s => s !== task.status).map(s => (
                                      <DropdownMenuItem key={s} onClick={(e) => { e.stopPropagation(); moveToStatus(task.id, s); }}>
                                        {STATUS_LABELS[s]}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <h4 className="font-medium text-sm mb-2 leading-tight">{task.title}</h4>
                        {task.description && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                            <AlignLeft className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{task.description}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(task.createdAt), "MMM d")}
                          </div>
                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-amber-400/80">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.dueDate), "MMM d")}
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {colTasks.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-white/5 rounded-lg flex items-center justify-center text-sm text-muted-foreground/50">
                    No tasks yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Add details..." className="min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={taskStatus} onValueChange={(val: any) => setTaskStatus(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskPriority} onValueChange={(val: any) => setTaskPriority(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            {editingTask && (
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 mr-auto" onClick={() => handleDelete(editingTask.id)}>
                Delete Task
              </Button>
            )}
            <Button variant="ghost" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!taskTitle.trim() || createTask.isPending || updateTask.isPending}>
              {createTask.isPending || updateTask.isPending ? "Saving..." : "Save Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}