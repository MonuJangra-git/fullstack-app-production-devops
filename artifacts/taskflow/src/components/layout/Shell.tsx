import { ReactNode } from "react";
import { Link, useLocation, useParams } from "wouter";
import { UserButton, useUser } from "@clerk/react";
import { useListWorkspaces } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  ListTodo, 
  Users, 
  Settings, 
  ChevronDown, 
  FolderKanban,
  Activity,
  Menu,
  Briefcase,
  BookOpen
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ShellProps {
  children: ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const params = useParams();
  const { user } = useUser();
  const workspaceIdStr = params.workspaceId;
  const workspaceId = workspaceIdStr ? Number(workspaceIdStr) : null;

  const { data: workspaces = [] } = useListWorkspaces();
  const currentWorkspace = workspaces.find(w => w.id === workspaceId);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/[0.05] bg-sidebar flex flex-col z-20 shadow-xl">
        <div className="h-16 flex items-center px-4 border-b border-white/[0.05]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-2 hover:bg-white/5">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    {currentWorkspace?.type === 'team' ? <Users className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                  </div>
                  <span className="font-semibold truncate text-sm">
                    {currentWorkspace?.name || "Select Workspace"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              {workspaces.map((ws) => (
                <DropdownMenuItem key={ws.id} asChild>
                  <Link href={`/workspaces/${ws.id}`} className="cursor-pointer">
                    {ws.name}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/workspaces" className="cursor-pointer text-primary">
                  View all workspaces
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {workspaceId && (
            <>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 mt-2">
                Workspace
              </div>
              <Button 
                asChild
                variant="ghost" 
                className={`w-full justify-start gap-3 px-2 ${location === `/workspaces/${workspaceId}` ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-white/5 text-muted-foreground hover:text-white'}`}
              >
                <Link href={`/workspaces/${workspaceId}`}>
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              </Button>
              <Button 
                asChild
                variant="ghost" 
                className={`w-full justify-start gap-3 px-2 ${location === `/workspaces/${workspaceId}/projects` ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-white/5 text-muted-foreground hover:text-white'}`}
              >
                <Link href={`/workspaces/${workspaceId}/projects`}>
                  <FolderKanban className="w-4 h-4" />
                  Projects
                </Link>
              </Button>
              <Button 
                asChild
                variant="ghost" 
                className={`w-full justify-start gap-3 px-2 ${location.includes(`/members`) ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-white/5 text-muted-foreground hover:text-white'}`}
              >
                <Link href={`/workspaces/${workspaceId}/members`}>
                  <Users className="w-4 h-4" />
                  Members
                </Link>
              </Button>
              <Button 
                asChild
                variant="ghost" 
                className={`w-full justify-start gap-3 px-2 ${location === `/workspaces/${workspaceId}/study-hub` ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-white/5 text-muted-foreground hover:text-white'}`}
              >
                <Link href={`/workspaces/${workspaceId}/study-hub`}>
                  <BookOpen className="w-4 h-4" />
                  Study Hub
                </Link>
              </Button>

              <div className="mt-6 mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Recent Projects</span>
              </div>
              {/* Projects list could go here. For now, empty or link to all */}
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/[0.05] flex items-center gap-3">
          <UserButton 
            appearance={{ 
              elements: { 
                userButtonAvatarBox: "w-8 h-8 border border-white/10",
                userButtonPopoverCard: "bg-popover border border-white/10 glass-panel"
              } 
            }} 
          />
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium truncate">{user?.fullName || user?.primaryEmailAddress?.emailAddress}</span>
            <span className="text-xs text-muted-foreground truncate">My Account</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
        <div className="flex-1 overflow-y-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}