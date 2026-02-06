'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Mail, Feather } from 'lucide-react';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/explore', icon: Search, label: 'Explore' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/messages', icon: Mail, label: 'Messages' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background-primary pb-safe sm:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/home' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-item ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Compose Button - Mobile */}
      <Link
        href="/compose"
        className="btn-primary fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center shadow-lg sm:hidden"
      >
        <Feather className="h-6 w-6" />
      </Link>
    </>
  );
}
