import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateLiveLocation } from '@/hooks/useQueries';

export const LiveLocationTracker = () => {
  const { isAuthenticated, employee } = useAuth();
  const updateLocationMutation = useUpdateLiveLocation();
  const lastSentRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !navigator.geolocation) return;

    const sendLocation = (latitude: number, longitude: number) => {
      const now = Date.now();
      // Throttle sends to at most once every 15 seconds unless moved > 20 meters
      if (lastSentRef.current) {
        const timeDiff = now - lastSentRef.current.time;
        const latDiff = Math.abs(latitude - lastSentRef.current.lat);
        const lngDiff = Math.abs(longitude - lastSentRef.current.lng);
        if (timeDiff < 15000 && latDiff < 0.0002 && lngDiff < 0.0002) {
          return;
        }
      }

      lastSentRef.current = { lat: latitude, lng: longitude, time: now };
      updateLocationMutation.mutate({
        latitude,
        longitude,
        employee: typeof employee?.id === 'number' ? employee.id : undefined,
      });
    };

    // 1. Send immediate position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Geolocation access:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // 2. Watch position continuously
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Geolocation watch:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    // 3. Periodic fallback interval every 30 seconds
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }, 30000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, employee]);

  return null;
};

export default LiveLocationTracker;
