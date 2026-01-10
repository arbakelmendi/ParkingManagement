import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { parkingsApi, Parking } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkeletonCard } from '@/components/ui/skeleton-loaders';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  MapPin,
  ParkingCircle,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Car,
} from 'lucide-react';

const Parkings: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingParking, setEditingParking] = useState<Parking | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    totalSpots: '',
    pricePerHour: '',
  });

  const { data: parkings, isLoading, isError, error } = useQuery({
    queryKey: ['parkings'],
    queryFn: parkingsApi.getAll,
  });

  useEffect(() => {
    if (parkings) {
      console.log(
        'Parkings fetched:',
        parkings.map((p) => ({
          id: p.id,
          totalSpots: p.totalSpots,
          availableSpots: p.availableSpots,
        }))
      );
    }
  }, [parkings]);

  const createMutation = useMutation({
    mutationFn: parkingsApi.create,
    onSuccess: (created) => {
      console.log('Create parking response:', created);
      queryClient.invalidateQueries({ queryKey: ['parkings'] });
      setIsCreateOpen(false);
      resetForm();
      toast.success('Parking created successfully');
      if (created?.id) {
        navigate(`/parkings/${created.id}`);
      }
    },
    onError: (error: any) => {
      console.error('Create parking error:', error?.response?.data || error);
      const details = error?.response?.data?.details || error?.response?.data?.error || error.message;
      toast.error('Failed to create parking', { description: details });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Parking> }) => {
      console.log('Update parking payload:', { id, data });
      return parkingsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkings'] });
      setEditingParking(null);
      resetForm();
      toast.success('Parking updated successfully');
    },
    onError: (error: any) => {
      const status = error?.status || error?.response?.status;
      const message = error?.message || error?.response?.data?.message || 'Update failed';
      if (status === 401 || status === 403) {
        toast.error('Not authorized to update parking');
        return;
      }
      if (status === 404) {
        toast.error('Parking not found');
        return;
      }
      toast.error('Failed to update parking', { description: message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('Delete parking request:', { id });
      return parkingsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkings'] });
      setDeletingId(null);
      toast.success('Parking deleted successfully');
    },
    onError: (error: any) => {
      const status = error?.status || error?.response?.status;
      const message = error?.message || error?.response?.data?.message || 'Delete failed';
      if (status === 401 || status === 403) {
        toast.error('Not authorized to delete parking');
        return;
      }
      if (status === 404) {
        toast.error('Parking not found');
        return;
      }
      if (status === 409) {
        toast.error('Cannot delete parking with reservations');
        return;
      }
      toast.error('Failed to delete parking', { description: message });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', location: '', totalSpots: '', pricePerHour: '' });
  };

  const openEditDialog = (parking: Parking) => {
    setFormData({
      name: parking.name,
      location: parking.location || parking.address || '',
      totalSpots: String(parking.totalSpots),
      pricePerHour: parking.pricePerHour ? String(parking.pricePerHour) : '',
    });
    setEditingParking(parking);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      location: formData.location,
      address: formData.location,
      totalSpots: parseInt(formData.totalSpots) || 0,
      pricePerHour: formData.pricePerHour ? parseFloat(formData.pricePerHour) : undefined,
    };
    console.log('Create parking payload:', data);

    if (editingParking) {
      updateMutation.mutate({ id: editingParking.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const normalizedSearch = searchQuery.toLowerCase();
  const filteredParkings = parkings?.filter((p) => {
    const name = (p.name || '').toLowerCase();
    const location = (p.location || '').toLowerCase();
    const address = (p.address || '').toLowerCase();
    return (
      name.includes(normalizedSearch) ||
      location.includes(normalizedSearch) ||
      address.includes(normalizedSearch)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parkings</h1>
          <p className="text-muted-foreground">Manage and browse parking locations</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Parking
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          variant="parking"
          title="Unable to load parkings"
          description={(error as any)?.message || 'Please try again later'}
        />
      ) : !filteredParkings?.length ? (
        <EmptyState
          variant="parking"
          title={searchQuery ? 'No parkings found' : 'No parkings yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query'
              : isAdmin
              ? 'Create your first parking location to get started'
              : 'No parking locations are available at the moment'
          }
          action={
            isAdmin && !searchQuery ? (
              <Button onClick={() => setIsCreateOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Create Parking
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredParkings.map((parking, index) => (
              <motion.div
                key={parking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <ParkingCard
                  parking={parking}
                  isAdmin={isAdmin}
                  onEdit={() => openEditDialog(parking)}
                  onDelete={() => setDeletingId(parking.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingParking}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingParking(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingParking ? 'Edit Parking' : 'Create Parking'}</DialogTitle>
            <DialogDescription>
              {editingParking
                ? 'Update the parking location details'
                : 'Add a new parking location to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Downtown Parking Garage"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location / Address</Label>
                <Input
                  id="location"
                  placeholder="123 Main Street"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalSpots">Total Spots</Label>
                  <Input
                    id="totalSpots"
                    type="number"
                    placeholder="100"
                    value={formData.totalSpots}
                    onChange={(e) => setFormData({ ...formData, totalSpots: e.target.value })}
                    required
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerHour">Price/Hour ($)</Label>
                  <Input
                    id="pricePerHour"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={formData.pricePerHour}
                    onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                    min="0"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingParking(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingParking ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Parking</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this parking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Parking Card Component
interface ParkingCardProps {
  parking: Parking;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const ParkingCard: React.FC<ParkingCardProps> = ({ parking, isAdmin, onEdit, onDelete }) => {
  const location = parking.location || parking.address;

  return (
    <div className="card-parking p-6 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Car className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{parking.name}</h3>
            {location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location}
              </p>
            )}
          </div>
        </div>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ParkingCircle className="w-4 h-4" />
          <span>
            {parking.availableSpots !== undefined ? (
              <>
                <span className="font-medium text-foreground">{parking.availableSpots}</span>/{parking.totalSpots} available
              </>
            ) : (
              <span className="font-medium text-foreground">{parking.totalSpots} spots</span>
            )}
          </span>
        </div>
        {parking.pricePerHour !== undefined && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium text-foreground">${parking.pricePerHour}/hr</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-border">
        <Link to={`/parkings/${parking.id}`}>
          <Button variant="outline" className="w-full">
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Parkings;
