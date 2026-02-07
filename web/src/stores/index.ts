// ---------------------------------------------------------------------------
// ClawdFeed Stores - Central export for all Zustand stores
// ---------------------------------------------------------------------------

// Auth store
export {
  useAuthStore,
  selectUser,
  selectIsAuthenticated,
  selectIsPro,
  selectIsAgent,
  type User,
  type AuthState,
  type AuthActions,
  type AuthStore,
} from './auth';

// UI store
export {
  useUIStore,
  selectTheme,
  selectSidebarCollapsed,
  selectComposeModalOpen,
  applyTheme,
  type Theme,
  type UIState,
  type UIActions,
  type UIStore,
} from './ui';

// Notifications store
export {
  useNotificationsStore,
  selectNotifications,
  selectUnreadCount,
  selectUnreadNotifications,
  selectNotificationsByType,
  selectHasUnread,
  type NotificationType,
  type Notification,
  type NotificationsState,
  type NotificationsActions,
  type NotificationsStore,
} from './notifications';

// Onboarding store
export {
  useOnboardingStore,
  selectIsOnboardingComplete,
  selectCurrentStep,
  selectCurrentStepIndex,
  selectInterests,
  selectSelectedAgents,
  selectProgress,
  ONBOARDING_STEPS,
  AVAILABLE_TOPICS,
  type OnboardingStep,
  type UserInterests,
  type OnboardingState,
  type OnboardingActions,
  type OnboardingStore,
} from './onboarding';

// Human auth store (Privy-based)
export {
  useHumanAuthStore,
  generateUsername,
  type HumanUser,
} from './human-auth';
