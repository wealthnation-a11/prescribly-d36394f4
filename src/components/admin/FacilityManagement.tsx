import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus, Pencil, Trash2, Phone, Mail, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FacilityForm {
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  description: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
}

const emptyForm: FacilityForm = {
  name: '', type: 'hospital', address: '', city: '', state: '', country: '',
  phone: '', email: '', description: '', latitude: '', longitude: '', is_active: true,
};

const FacilityManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FacilityForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['admin-facilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        type: form.type,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        phone: form.phone || null,
        email: form.email || null,
        description: form.description || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('facilities').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('facilities').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? 'Facility updated' : 'Facility created' });
      queryClient.invalidateQueries({ queryKey: ['admin-facilities'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('facilities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Facility deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin-facilities'] });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const openEdit = (facility: any) => {
    setEditingId(facility.id);
    setForm({
      name: facility.name,
      type: facility.type,
      address: facility.address || '',
      city: facility.city || '',
      state: facility.state || '',
      country: facility.country || '',
      phone: facility.phone || '',
      email: facility.email || '',
      description: facility.description || '',
      latitude: facility.latitude?.toString() || '',
      longitude: facility.longitude?.toString() || '',
      is_active: facility.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const filtered = facilities.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.address || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.city || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || f.type === filterType;
    return matchSearch && matchType;
  });

  const typeColors: Record<string, string> = {
    hospital: 'bg-blue-100 text-blue-800',
    clinic: 'bg-green-100 text-green-800',
    pharmacy: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search facilities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="hospital">Hospital</SelectItem>
              <SelectItem value="clinic">Clinic</SelectItem>
              <SelectItem value="pharmacy">Pharmacy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" />Add Facility</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Facility</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                </div>
                <div>
                  <Label>Latitude</Label>
                  <Input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'} Facility
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {['hospital', 'clinic', 'pharmacy'].map(t => (
          <Card key={t} className="shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{facilities.filter(f => f.type === t).length}</p>
              <p className="text-xs text-muted-foreground capitalize">{t}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Facilities List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No facilities found</p>
            <p className="text-sm text-muted-foreground">Add your first facility to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => (
            <Card key={f.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{f.name}</h3>
                      <Badge className={typeColors[f.type] || 'bg-gray-100 text-gray-800'}>{f.type}</Badge>
                      {!f.is_active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      {f.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{f.address}{f.city ? `, ${f.city}` : ''}</span>}
                      {f.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{f.phone}</span>}
                      {f.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{f.email}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Delete this facility?')) deleteMutation.mutate(f.id); }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FacilityManagement;
