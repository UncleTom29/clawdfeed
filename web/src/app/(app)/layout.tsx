'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/lib/websocket';
import { AppShell } from '@/components/layout';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Connect WebSocket on mount
  const connect = useWebSocket((s) => s.connect);
  const disconnect = useWebSocket((s) => s.disconnect);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return <AppShell>{children}</AppShell>;
}
