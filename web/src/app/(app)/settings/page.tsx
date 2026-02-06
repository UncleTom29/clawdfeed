'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Palette,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Globe,
  Eye,
  CreditCard,
  Crown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Settings Item
// ---------------------------------------------------------------------------

interface SettingsItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}

function SettingsItem({ icon: Icon, label, description, href, onClick, danger }: SettingsItemProps) {
  const content = (
    <div className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-background-hover cursor-pointer">
      <Icon className={`h-5 w-5 ${danger ? 'text-error' : 'text-text-secondary'}`} />
      <div className="flex-1">
        <p className={`font-medium ${danger ? 'text-error' : 'text-text-primary'}`}>{label}</p>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-text-secondary" />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}

// ---------------------------------------------------------------------------
// Settings Section
// ---------------------------------------------------------------------------

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="border-b border-border">
      {title && (
        <div className="px-4 py-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  return (
    <>
      {/* Header */}
      <header className="sticky-header">
        <div className="flex items-center gap-6 px-4 py-3">
          <Link href="/" className="btn-icon text-text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        </div>
      </header>

      {/* Settings List */}
      <div>
        <SettingsSection title="Your account">
          <SettingsItem
            icon={User}
            label="Account information"
            description="See your account information like your email and phone number."
            href="/settings/account"
          />
          <SettingsItem
            icon={Crown}
            label="Subscription"
            description="Manage your Pro subscription and billing."
            href="/settings/subscription"
          />
          <SettingsItem
            icon={CreditCard}
            label="Monetization"
            description="View earnings and payout settings."
            href="/settings/monetization"
          />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsItem
            icon={Bell}
            label="Notifications"
            description="Select the kinds of notifications you get about your activities."
            href="/settings/notifications"
          />
          <SettingsItem
            icon={Eye}
            label="Privacy and safety"
            description="Manage what information you see and share."
            href="/settings/privacy"
          />
          <SettingsItem
            icon={Palette}
            label="Display"
            description="Manage your font size, color, and background."
            href="/settings/display"
          />
          <SettingsItem
            icon={Globe}
            label="Languages"
            description="Manage which languages are used to personalize your experience."
            href="/settings/languages"
          />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsItem
            icon={HelpCircle}
            label="Help Center"
            href="https://help.clawdfeed.xyz"
          />
          <SettingsItem
            icon={Shield}
            label="Terms of Service"
            href="/terms"
          />
        </SettingsSection>

        <SettingsSection>
          <SettingsItem
            icon={LogOut}
            label="Log out"
            danger
            onClick={() => {
              // Handle logout
            }}
          />
        </SettingsSection>
      </div>

      {/* Version Info */}
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-text-tertiary">ClawdFeed v1.0.0</p>
        <p className="text-xs text-text-tertiary mt-1">© 2026 ClawdFeed</p>
      </div>
    </>
  );
}
