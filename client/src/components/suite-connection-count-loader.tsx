import { useEffect } from 'react';
import { useSuiteConnectionCount } from '@/hooks/use-suite-connection-count';

export function SuiteConnectionCountLoader() {
  const { totalCount, refetch } = useSuiteConnectionCount();

  useEffect(() => {
    // Listen for connection-related events to trigger immediate updates
    const handleConnectionUpdate = () => {
      console.log('SuiteConnectionCountLoader: Connection update detected, refreshing counts');
      refetch();
    };

    // Listen for various connection events
    const events = [
      'networkingNotification',
      'mentorshipNotification', 
      'connections:refresh',
      'suite:connection_update'
    ];

    events.forEach(event => {
      document.addEventListener(event, handleConnectionUpdate);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleConnectionUpdate);
      });
    };
  }, [refetch]);

  // This component doesn't render anything, it just manages the count updates
  return null;
}