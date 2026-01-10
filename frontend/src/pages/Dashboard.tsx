import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { adminApi, parkingsApi, spotsApi, reservationsApi } from '@/lib/api';
import { SkeletonStats } from '@/components/ui/skeleton-loaders';
import { Button } from '@/components/ui/button';
import {
  ParkingCircle,
  Car,
  Calendar,
  Activity,
  TrendingUp,
  Users,
  Clock,
  MapPin,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  });

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      const [parkings, spots, reservations] = await Promise.all([
        parkingsApi.getAll(),
        spotsApi.getAll(),
        reservationsApi.getAllReservations(),
      ]);
      return { parkings, spots, reservations };
    },
  });

  const recentActivity = useMemo(() => {
    if (!dashboardData?.reservations?.length) return [];
    return [...dashboardData.reservations]
      .sort((a, b) => new Date(b.StartTime).getTime() - new Date(a.StartTime).getTime())
      .slice(0, 6)
      .map((reservation) => {
        const parkingName = reservation.parking?.name || `Parking ${reservation.ParkingId}`;
        const time = reservation.StartTime
          ? formatDistanceToNow(new Date(reservation.StartTime), { addSuffix: true })
          : 'just now';
        return {
          text: `Reservation at ${parkingName}`,
          time,
          type: 'reservation' as const,
        };
      });
  }, [dashboardData?.reservations]);

  const topLocations = useMemo(() => {
    if (!dashboardData?.parkings?.length) return [];
    const spotsByParking = new Map<string, { total: number; occupied: number }>();

    for (const spot of dashboardData.spots || []) {
      const key = String(spot.ParkingId ?? '');
      if (!key) continue;
      const entry = spotsByParking.get(key) || { total: 0, occupied: 0 };
      entry.total += 1;
      if (!spot.IsAvailable) entry.occupied += 1;
      spotsByParking.set(key, entry);
    }

    return dashboardData.parkings
      .map((parking) => {
        const key = String(parking.id);
        const spotStats = spotsByParking.get(key);
        const total = spotStats?.total ?? parking.totalSpots ?? 0;
        const occupied =
          spotStats?.occupied ??
          (parking.availableSpots !== undefined ? Math.max(0, total - parking.availableSpots) : 0);
        const occupancy = total ? Math.round((occupied / total) * 100) : 0;
        return { name: parking.name, occupancy };
      })
      .sort((a, b) => b.occupancy - a.occupancy)
      .slice(0, 4);
  }, [dashboardData?.parkings, dashboardData?.spots]);

  const statCards = [
    {
      title: 'Total Parkings',
      value: stats?.totalParkings || 0,
      icon: ParkingCircle,
      color: 'bg-accent/10 text-accent',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Total Spots',
      value: stats?.totalSpots || 0,
      icon: Car,
      color: 'bg-success/10 text-success',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Total Reservations',
      value: stats?.totalReservations || 0,
      icon: Calendar,
      color: 'bg-warning/10 text-warning',
      trend: '+23%',
      trendUp: true,
    },
    {
      title: 'Active Reservations',
      value: stats?.activeReservations || 0,
      icon: Activity,
      color: 'bg-primary/10 text-primary',
      trend: '-5%',
      trendUp: false,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your parking management dashboard</p>
        </div>
        <Button asChild className="bg-accent text-accent-foreground">
          <Link to="/admin/users">Manage Users</Link>
        </Button>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="card-parking p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground">
                  {stat.value.toLocaleString()}
                </span>
                <div
                  className={`flex items-center text-sm ${
                    stat.trendUp ? 'text-success' : 'text-destructive'
                  }`}
                >
                  <TrendingUp
                    className={`w-4 h-4 mr-1 ${!stat.trendUp && 'rotate-180'}`}
                  />
                  {stat.trend}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="card-parking p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Recent Activity
          </h2>
          {isDashboardLoading ? (
            <div className="text-sm text-muted-foreground">Loading activity…</div>
          ) : recentActivity.length ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.text}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No recent activity yet.</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="card-parking p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            Top Locations
          </h2>
          {isDashboardLoading ? (
            <div className="text-sm text-muted-foreground">Loading locations…</div>
          ) : topLocations.length ? (
            <div className="space-y-4">
              {topLocations.map((location, index) => (
                <div key={location.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">{location.name}</span>
                    <span className="text-muted-foreground">{location.occupancy}% full</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${location.occupancy}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`h-full rounded-full ${
                        location.occupancy > 80
                          ? 'bg-destructive'
                          : location.occupancy > 60
                          ? 'bg-warning'
                          : 'bg-success'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No location data yet.</div>
          )}
        </motion.div>
      </div>

      {/* System Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="card-parking p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          System Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold text-accent mb-1">
              {stats?.totalParkings ? Math.round((stats.activeReservations || 0) / (stats.totalParkings || 1) * 100) : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Overall Occupancy</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold text-success mb-1">
              {stats?.totalSpots ? stats.totalSpots - (stats.activeReservations || 0) : 0}
            </div>
            <p className="text-sm text-muted-foreground">Available Spots</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold text-warning mb-1">
              {stats?.totalReservations ? Math.round((stats.totalReservations || 0) / 7) : 0}
            </div>
            <p className="text-sm text-muted-foreground">Avg. Daily Bookings</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
