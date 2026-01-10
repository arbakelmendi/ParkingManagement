import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInHours, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { parkingsApi, spotsApi, reservationsApi, Parking, Spot } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  ParkingCircle,
  DollarSign,
  Clock,
  Car,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const isSpotLike = (value: unknown): value is Spot => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' ||
    typeof record.Id === 'number' ||
    typeof record.ID === 'number' ||
    typeof record.spotId === 'string' ||
    typeof record.SpotId === 'string'
  );
};

const normalizeUpdatedSpot = (
  response: unknown,
  previous: Spot,
  payload?: Partial<Spot>
): Spot => {
  if (isSpotLike(response)) {
    return {
      ...previous,
      ...(response as Spot),
      id: (response as Spot).id || previous.id,
    };
  }
  return {
    ...previous,
    ...(payload ?? {}),
    id: previous.id,
  };
};

const toIsoString = (value: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const toLocalDateTimeValue = (value: Date) => {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours()
  )}:${pad(value.getMinutes())}`;
};

const ParkingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const parkingId = Number(id);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [isSpotDialogOpen, setIsSpotDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [deletingSpotId, setDeletingSpotId] = useState<string | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('');

  // Reservation form
  const [reservationForm, setReservationForm] = useState({
    vehiclePlate: '',
    startTime: '',
    endTime: '',
  });

  // Spot form
  const [spotForm, setSpotForm] = useState({
    spotNumber: '',
    isAvailable: true,
  });

  const {
    data: parking,
    isLoading: isParkingLoading,
    isError: isParkingError,
    error: parkingError,
  } = useQuery({
    queryKey: ['parking', id],
    queryFn: () => parkingsApi.getById(id!),
    enabled: !!id && Number.isFinite(parkingId),
  });

  const {
    data: spots,
    isLoading: isSpotsLoading,
    isError: isSpotsError,
    error: spotsError,
  } = useQuery({
    queryKey: ['spots', id],
    queryFn: () => spotsApi.getByParkingId(id!),
    enabled: !!id && Number.isFinite(parkingId),
  });

  useEffect(() => {
    console.log('Fetching parking details', { parkingId, rawId: id });
    if (parking) {
      console.log('Parking fetched:', {
        id: parking.id,
        totalSpots: parking.totalSpots,
        availableSpots: parking.availableSpots,
      });
    }
    if (spots) {
      console.log('Spots fetched:', { parkingId: id, count: spots.length });
    }
  }, [parking, spots, id]);

  const startIso = useMemo(() => toIsoString(reservationForm.startTime), [reservationForm.startTime]);
  const endIso = useMemo(() => toIsoString(reservationForm.endTime), [reservationForm.endTime]);
  const hasRange = Boolean(startIso && endIso);

  const { data: reservedSpotIds = [], isLoading: isAvailabilityLoading } = useQuery({
    queryKey: ['spots-availability', id, startIso, endIso],
    queryFn: () =>
      reservationsApi.getAvailability({
        start: startIso,
        end: endIso,
        parkingId: id!,
      }),
    enabled: !!id && !!startIso && !!endIso,
  });

  const reservedSpotIdSet = useMemo(
    () => new Set(reservedSpotIds.map((value) => String(value))),
    [reservedSpotIds]
  );

  const sortedSpots = useMemo(() => {
    return (spots ?? []).slice().sort((a, b) => {
      const aNum = Number(a.SpotNumber ?? a.id);
      const bNum = Number(b.SpotNumber ?? b.id);
      if (!Number.isFinite(aNum) || !Number.isFinite(bNum)) return 0;
      return aNum - bNum;
    });
  }, [spots]);

  // Spot mutations
  const createSpotMutation = useMutation({
    mutationFn: spotsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots', id] });
      setIsSpotDialogOpen(false);
      setSpotForm({ spotNumber: '', isAvailable: true });
      toast.success('Spot created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create spot', { description: error.message });
    },
  });

  const updateSpotMutation = useMutation({
    mutationFn: async ({ spotId, data }: { spotId: string; data: Partial<Spot> }) => {
      console.log('updating spot', spotId, data);
      return spotsApi.update(spotId, data);
    },
    onMutate: async ({ spotId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['spots', id] });
      const previousSpots = queryClient.getQueryData<Spot[]>(['spots', id]);
      if (previousSpots) {
        queryClient.setQueryData<Spot[]>(['spots', id], (current) =>
          (current ?? []).map((spot) =>
            spot.id === spotId
              ? {
                  ...spot,
                  SpotNumber:
                    data.SpotNumber !== undefined ? String(data.SpotNumber) : spot.SpotNumber,
                  IsAvailable:
                    data.IsAvailable !== undefined ? Boolean(data.IsAvailable) : spot.IsAvailable,
                }
              : spot
          )
        );
      }
      const optimisticSpots = queryClient.getQueryData<Spot[]>(['spots', id]) ?? [];
      console.log('spots after update', optimisticSpots);
      return { previousSpots };
    },
    onSuccess: (updated, variables) => {
      console.log('update response', updated);
      const spotId = variables.spotId;
      queryClient.setQueryData<Spot[]>(['spots', id], (current) => {
        const safeCurrent = current ?? [];
        const nextSpots = safeCurrent.map((spot) =>
          spot.id === spotId ? normalizeUpdatedSpot(updated, spot, variables.data) : spot
        );
        console.log('spots after update', nextSpots);
        return nextSpots;
      });
      if (!isSpotLike(updated)) {
        queryClient.refetchQueries({ queryKey: ['spots', id] });
      }
      queryClient.invalidateQueries({ queryKey: ['spots', id] });
      setEditingSpot(null);
      setSpotForm({ spotNumber: '', isAvailable: true });
      toast.success('Spot updated successfully');
    },
    onError: (error: any, _vars, context) => {
      if (context?.previousSpots) {
        queryClient.setQueryData(['spots', id], context.previousSpots);
      }
      toast.error('Failed to update spot', { description: error.message });
    },
  });

  const deleteSpotMutation = useMutation({
    mutationFn: spotsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots', id] });
      setDeletingSpotId(null);
      toast.success('Spot deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete spot', { description: error.message });
    },
  });

  // Reservation mutation
  const createReservationMutation = useMutation({
    mutationFn: reservationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots', id] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['spots-availability', id] });
      setReservationForm({ vehiclePlate: '', startTime: '', endTime: '' });
      setSelectedSpotId('');
      toast.success('Reservation created successfully!');
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      const message = error?.response?.data?.message || error?.message;
      if (status === 400 && code === 'RESERVATION_IN_PAST') {
        toast.error("You can't reserve in the past.");
        return;
      }
      if (status === 400 && code === 'INVALID_TIME_RANGE') {
        toast.error('End time must be after start time.');
        return;
      }
      if (status === 409 && code === 'RESERVATION_CONFLICT') {
        toast.error('This spot is already reserved for that time.');
        if (selectedSpotId && hasRange) {
          queryClient.setQueryData<string[]>(
            ['spots-availability', id, startIso, endIso],
            (current) => {
              const next = new Set((current || []).map(String));
              next.add(String(selectedSpotId));
              return Array.from(next);
            }
          );
        }
        return;
      }
      toast.error('Failed to create reservation', { description: message });
    },
  });

  const openEditSpot = (spot: Spot) => {
    setSpotForm({
      spotNumber: spot.SpotNumber,
      isAvailable: spot.IsAvailable,
    });
    setEditingSpot(spot);
  };

  const handleSpotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const spotNumberValue = Number(spotForm.spotNumber);
    if (!Number.isFinite(spotNumberValue) || spotNumberValue <= 0) {
      toast.error('Spot number must be a positive number');
      return;
    }
    const data = {
      ParkingId: id!,
      SpotNumber: spotNumberValue,
      IsAvailable: spotForm.isAvailable,
    };

    if (editingSpot) {
      updateSpotMutation.mutate({ spotId: editingSpot.id, data });
    } else {
      createSpotMutation.mutate(data);
    }
  };

  const handleSpotStatusToggle = (spot: Spot, nextAvailable: boolean) => {
    if (spot.IsAvailable === nextAvailable) {
      return;
    }
    updateSpotMutation.mutate({
      spotId: spot.id,
      data: {
        ParkingId: id!,
        SpotNumber: Number(spot.SpotNumber),
        IsAvailable: nextAvailable,
      },
    });
  };

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpotId) {
      toast.error('Please select a spot');
      return;
    }
    const now = new Date();
    const start = new Date(reservationForm.startTime);
    const end = new Date(reservationForm.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error('Please select a valid start and end time.');
      return;
    }
    if (start < now) {
      toast.error("You can't reserve in the past.");
      return;
    }
    if (start >= end) {
      toast.error('End time must be after start time.');
      return;
    }
    const selectedSpot = spots?.find((spot) => spot.id === selectedSpotId);
    const isReserved =
      !!selectedSpot && (reservedSpotIdSet.has(selectedSpot.id) || !selectedSpot.IsAvailable);
    if (isReserved) {
      toast.error('This spot is not available for the selected time.');
      return;
    }

    createReservationMutation.mutate({
      ParkingId: id!,
      SpotId: selectedSpotId,
      VehiclePlate: reservationForm.vehiclePlate,
      StartTime: new Date(reservationForm.startTime).toISOString(),
      EndTime: new Date(reservationForm.endTime).toISOString(),
    });
  };

  // Calculate estimated cost
  const calculateCost = () => {
    if (!parking?.pricePerHour || !reservationForm.startTime || !reservationForm.endTime) {
      return null;
    }
    try {
      const start = parseISO(reservationForm.startTime);
      const end = parseISO(reservationForm.endTime);
      const hours = Math.max(1, differenceInHours(end, start));
      return (hours * parking.pricePerHour).toFixed(2);
    } catch {
      return null;
    }
  };

  const estimatedCost = calculateCost();
  const minStart = toLocalDateTimeValue(new Date());
  const minEnd = reservationForm.startTime
    ? toLocalDateTimeValue(new Date(reservationForm.startTime))
    : minStart;

  if (!id || !Number.isFinite(parkingId)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invalid parking id</p>
        <Link to="/parkings">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Parkings
          </Button>
        </Link>
      </div>
    );
  }

  if (isParkingLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isParkingError) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Failed to load parking details{parkingError ? `: ${String(parkingError)}` : ''}.
        </p>
        <Link to="/parkings">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Parkings
          </Button>
        </Link>
      </div>
    );
  }

  if (!parking) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Parking not found</p>
        <Link to="/parkings">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Parkings
          </Button>
        </Link>
      </div>
    );
  }

  const availableSpots = sortedSpots.filter((s) => s.IsAvailable);
  const availableForRange = sortedSpots.filter(
    (s) => s.IsAvailable && !reservedSpotIdSet.has(s.id)
  );
  const baseTotal = parking?.totalSpots || spots?.length || 0;
  const baseAvailable =
    parking?.availableSpots !== undefined ? parking.availableSpots : availableSpots.length;
  const availableCount = hasRange ? availableForRange.length : baseAvailable;
  const selectedSpot = spots?.find((spot) => spot.id === selectedSpotId);
  const selectedSpotUnavailable =
    !!selectedSpot &&
    (!selectedSpot.IsAvailable || reservedSpotIdSet.has(selectedSpot.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/parkings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{parking.name}</h1>
          {(parking.location || parking.address) && (
            <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4" />
              {parking.location || parking.address}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-parking p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ParkingCircle className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Spots</p>
            <p className="text-2xl font-bold text-foreground">{baseTotal}</p>
          </div>
        </div>
        <div className="card-parking p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold text-foreground">{baseAvailable}</p>
          </div>
        </div>
        {parking.pricePerHour !== undefined && (
          <div className="card-parking p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="text-2xl font-bold text-foreground">${parking.pricePerHour}/hr</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spots">Spots ({spots?.length || 0})</TabsTrigger>
          <TabsTrigger value="reserve">Make Reservation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="card-parking p-6">
            <h3 className="font-semibold text-foreground mb-4">About this Parking</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium">{baseTotal} spots</span>
              </div>
              {parking.pricePerHour && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Hourly Rate:</span>
                  <span className="font-medium">${parking.pricePerHour}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <Badge className={baseAvailable > 0 ? 'badge-available' : 'badge-occupied'}>
                  {baseAvailable > 0 ? 'Open' : 'Full'}
                </Badge>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="spots" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {availableCount} of {baseTotal} spots available
              {hasRange && isAvailabilityLoading ? ' (checking availability...)' : ''}
            </p>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setIsSpotDialogOpen(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Spot
              </Button>
            )}
          </div>

          {isSpotsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-20 skeleton rounded-lg" />
              ))}
            </div>
          ) : isSpotsError ? (
            <div className="text-center py-12 text-muted-foreground">
              Failed to load spots{spotsError ? `: ${String(spotsError)}` : ''}.
            </div>
          ) : !spots?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              No spots configured for this parking
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <AnimatePresence>
                {sortedSpots.map((spot, index) => (
                  <motion.div
                    key={spot.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={cn(
                      'relative p-4 rounded-lg border-2 text-center transition-all',
                      reservedSpotIdSet.has(spot.id) || !spot.IsAvailable
                        ? 'border-destructive/30 bg-destructive/5'
                        : 'border-success/30 bg-success/5 hover:border-success/50'
                    )}
                  >
                    <div className="font-bold text-lg">{spot.SpotNumber}</div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs mt-1',
                        reservedSpotIdSet.has(spot.id) || !spot.IsAvailable
                          ? 'badge-occupied'
                          : 'badge-available'
                      )}
                    >
                      {reservedSpotIdSet.has(spot.id)
                        ? 'Reserved'
                        : spot.IsAvailable
                        ? 'Available'
                        : 'Occupied'}
                    </Badge>
                    {isAdmin && (
                      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                        <label className="flex items-center gap-1.5">
                          <Checkbox
                            checked={spot.IsAvailable}
                            onCheckedChange={(checked) => {
                              if (!checked) return;
                              handleSpotStatusToggle(spot, true);
                            }}
                          />
                          <span>Available</span>
                        </label>
                        <label className="flex items-center gap-1.5">
                          <Checkbox
                            checked={!spot.IsAvailable}
                            onCheckedChange={(checked) => {
                              if (!checked) return;
                              handleSpotStatusToggle(spot, false);
                            }}
                          />
                          <span>Occupied</span>
                        </label>
                      </div>
                    )}
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditSpot(spot)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingSpotId(spot.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reserve" className="space-y-4">
          <div className="card-parking p-6 max-w-xl">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Reserve a Spot
            </h3>
            <form onSubmit={handleReservationSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Select Spot</Label>
                <Select value={selectedSpotId} onValueChange={setSelectedSpotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an available spot" />
                  </SelectTrigger>
                  <SelectContent>
                    {!spots?.length ? (
                      <SelectItem value="_none" disabled>
                        No spots available
                      </SelectItem>
                    ) : (
                      sortedSpots.map((spot) => {
                        const isReserved = reservedSpotIdSet.has(spot.id);
                        const isDisabled = isReserved || !spot.IsAvailable;
                        const label = isReserved
                          ? 'Reserved'
                          : spot.IsAvailable
                          ? 'Available'
                          : 'Occupied';
                        return (
                          <SelectItem key={spot.id} value={spot.id} disabled={isDisabled}>
                            Spot {spot.SpotNumber} · {label}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehiclePlate">Vehicle Plate</Label>
                <Input
                  id="vehiclePlate"
                  placeholder="ABC-1234"
                  value={reservationForm.vehiclePlate}
                  onChange={(e) =>
                    setReservationForm({ ...reservationForm, vehiclePlate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={reservationForm.startTime}
                    min={minStart}
                    onChange={(e) =>
                      setReservationForm({ ...reservationForm, startTime: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={reservationForm.endTime}
                    min={minEnd}
                    onChange={(e) =>
                      setReservationForm({ ...reservationForm, endTime: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {estimatedCost && (
                <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="text-xl font-bold text-accent">${estimatedCost}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={
                  createReservationMutation.isPending ||
                  (!hasRange ? baseAvailable === 0 : availableForRange.length === 0) ||
                  selectedSpotUnavailable
                }
              >
                {createReservationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Reservation'
                )}
              </Button>
            </form>
          </div>
        </TabsContent>
      </Tabs>

      {/* Spot Create/Edit Dialog */}
      <Dialog
        open={isSpotDialogOpen || !!editingSpot}
        onOpenChange={(open) => {
          if (!open) {
            setIsSpotDialogOpen(false);
            setEditingSpot(null);
            setSpotForm({ spotNumber: '', isAvailable: true });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpot ? 'Edit Spot' : 'Add Spot'}</DialogTitle>
            <DialogDescription>
              {editingSpot ? 'Update the spot details' : 'Add a new parking spot'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSpotSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="spotNumber">Spot Number</Label>
                <Input
                  id="spotNumber"
                  placeholder="A1"
                  value={spotForm.spotNumber}
                  onChange={(e) => setSpotForm({ ...spotForm, spotNumber: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={spotForm.isAvailable}
                  onChange={(e) => setSpotForm({ ...spotForm, isAvailable: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="isAvailable">Available</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSpotDialogOpen(false);
                  setEditingSpot(null);
                  setSpotForm({ spotNumber: '', isAvailable: true });
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={createSpotMutation.isPending || updateSpotMutation.isPending}
              >
                {(createSpotMutation.isPending || updateSpotMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingSpot ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Spot Confirmation */}
      <Dialog open={!!deletingSpotId} onOpenChange={() => setDeletingSpotId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Spot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this spot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSpotId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingSpotId && deleteSpotMutation.mutate(deletingSpotId)}
              disabled={deleteSpotMutation.isPending}
            >
              {deleteSpotMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParkingDetails;
