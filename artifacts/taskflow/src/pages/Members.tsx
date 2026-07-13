import { useState } from "react";
import { useParams } from "wouter";
import { 
  useGetWorkspace,
  useListWorkspaceMembers, 
  useInviteWorkspaceMember, 
  useRemoveWorkspaceMember,
  getListWorkspaceMembersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Mail, UserMinus, Shield, ShieldAlert, User, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function Members() {
  const { workspaceId: wsIdStr } = useParams();
  const workspaceId = Number(wsIdStr);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspace } = useGetWorkspace(workspaceId);
  const { data: members, isLoading } = useListWorkspaceMembers(workspaceId);
  
  const inviteMember = useInviteWorkspaceMember();
  const removeMember = useRemoveWorkspaceMember();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin"|"member">("member");

  const canManage = workspace?.role === 'owner' || workspace?.role === 'admin';

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMember.mutate(
      { workspaceId, data: { email: inviteEmail, role: inviteRole } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) });
          toast({ title: "Invitation sent", description: `Invited ${inviteEmail} as ${inviteRole}` });
          setIsInviteOpen(false);
          setInviteEmail("");
        },
        onError: (err: any) => {
          toast({ title: "Invite failed", description: err?.response?.data?.message || "Could not invite member", variant: "destructive" });
        }
      }
    );
  };

  const handleRemove = (memberId: number, email: string) => {
    if(!confirm(`Remove ${email} from workspace?`)) return;
    removeMember.mutate(
      { workspaceId, memberId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) });
          toast({ title: "Member removed" });
        },
        onError: () => toast({ title: "Error", description: "Failed to remove member", variant: "destructive" })
      }
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Members</h1>
          <p className="text-muted-foreground">Manage who has access to {workspace?.name}.</p>
        </div>
        {canManage && (
          <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Invite Member
          </Button>
        )}
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Workspace Members
          </CardTitle>
          <CardDescription>
            {members?.length || 0} active and pending members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : members?.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">No members found.</div>
          ) : (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 border-b border-white/10 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Joined</th>
                    <th className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members?.map(m => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                          {m.email.charAt(0).toUpperCase()}
                        </div>
                        {m.email}
                      </td>
                      <td className="px-6 py-4 capitalize">
                        <div className="flex items-center gap-1.5">
                          {m.role === 'owner' ? <ShieldAlert className="w-4 h-4 text-amber-500" /> : 
                           m.role === 'admin' ? <Shield className="w-4 h-4 text-primary" /> : 
                           <User className="w-4 h-4 text-muted-foreground" />}
                          {m.role}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={m.status === 'active' ? 'success' : 'warning'} className="bg-opacity-10 text-[10px]">
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(m.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canManage && m.role !== 'owner' && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemove(m.id, m.email)}>
                            <UserMinus className="w-4 h-4 mr-2" /> Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email" 
                value={inviteEmail} 
                onChange={e => setInviteEmail(e.target.value)} 
                placeholder="colleague@company.com" 
                autoFocus 
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(val: any) => setInviteRole(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member (Can manage tasks)</SelectItem>
                  <SelectItem value="admin">Admin (Can manage projects & members)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteMember.isPending}>
              {inviteMember.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}