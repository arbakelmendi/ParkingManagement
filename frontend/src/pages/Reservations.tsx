import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { reservationsApi, Reservation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonTable } from '@/components/ui/skeleton-loaders';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import {
  Search,
  Calendar,
  Car,
  Clock,
  Trash2,
  Loader2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortField = 'startTime' | 'endTime' | 'vehiclePlate';
type SortOrder = 'asc' | 'desc';

const Reservations: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', isAdmin],
    queryFn: () => (isAdmin ? reservationsApi.getAllReservations() : reservationsApi.getMyReservations()),
  });

  const deleteMutation = useMutation({
    mutationFn: reservationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setDeletingId(null);
      toast.success('Reservation cancelled successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to cancel reservation', { description: error.message });
    },
  });

  const getReservationStatus = (reservation: Reservation): 'active' | 'upcoming' | 'completed' | 'cancelled' => {
    if (reservation.Status === 'cancelled') return 'cancelled';
    
    const now = new Date();
    try {
      const start = parseISO(reservation.StartTime);
      const end = parseISO(reservation.EndTime);
      
      if (isAfter(now, end)) return 'completed';
      if (isBefore(now, start)) return 'upcoming';
      return 'active';
    } catch {
      return 'upcoming';
    }
  };

  const statusBadgeStyles = {
    active: 'bg-success/10 text-success border-success/20',
    upcoming: 'bg-accent/10 text-accent border-accent/20',
    completed: 'bg-muted text-muted-foreground border-muted',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const filteredAndSortedReservations = useMemo(() => {
    if (!reservations) return [];

    const query = searchQuery.trim().toLowerCase();
    let filtered = reservations.filter((r) => {
      if (!query) return statusFilter === 'all' ? true : getReservationStatus(r) === statusFilter;

      const haystack = [
        r.VehiclePlate,
        r.parking?.name,
        r.spot?.SpotNumber,
        r.SpotId,
        r.ParkingId,
        r.StartTime,
        r.EndTime,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      const searchMatch = haystack.some((v) => v.includes(query));

      if (statusFilter === 'all') return searchMatch;
      return searchMatch && getReservationStatus(r) === statusFilter;
    });

    filtered.sort((a, b) => {
      let aValue: string | Date = '';
      let bValue: string | Date = '';

      switch (sortField) {
        case 'startTime':
          aValue = a.StartTime;
          bValue = b.StartTime;
          break;
        case 'endTime':
          aValue = a.EndTime;
          bValue = b.EndTime;
          break;
        case 'vehiclePlate':
          aValue = a.VehiclePlate || '';
          bValue = b.VehiclePlate || '';
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [reservations, searchQuery, statusFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reservations</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'View and manage all reservations' : 'View and manage your reservations'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by plate, parking, or spot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="card-parking p-6">
          <SkeletonTable rows={5} />
        </div>
      ) : !filteredAndSortedReservations.length ? (
        <EmptyState
          variant="reservations"
          title={searchQuery || statusFilter !== 'all' ? 'No reservations found' : 'No reservations yet'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Your reservations will appear here once you make one'
          }
        />
      ) : (
        <div className="card-parking overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('vehiclePlate')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Vehicle
                      <SortIcon field="vehiclePlate" />
                    </Button>
                  </TableHead>
                  <TableHead>Parking / Spot</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('startTime')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Start Time
                      <SortIcon field="startTime" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('endTime')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      End Time
                      <SortIcon field="endTime" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredAndSortedReservations.map((reservation, index) => {
                    const status = getReservationStatus(reservation);
                    return (
                      <motion.tr
                        key={reservation.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="border-b border-border"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                              <Car className="w-4 h-4 text-accent" />
                            </div>
                            <span className="font-medium">{reservation.VehiclePlate}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-medium">
                              {reservation.parking?.name || `Parking ${reservation.ParkingId}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Spot {reservation.spot?.SpotNumber || reservation.SpotId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {formatDate(reservation.StartTime)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {formatDate(reservation.EndTime)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('capitalize', statusBadgeStyles[status])}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(reservation.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this reservation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Keep Reservation
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reservations;
