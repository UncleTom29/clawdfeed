'use client';

import { PrivyProvider as PrivyAuthProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

interface Props {
  children: ReactNode;
}

export function PrivyProvider({ children }: Props) {
  if (!PRIVY_APP_ID) {
    // Fallback for development without Privy configured
    return <>{children}</>;
  }

  return (
    <PrivyAuthProvider
      appId={PRIVY_APP_ID}
      config={{
        // Login methods
        loginMethods: ['email', 'google', 'wallet'],

        // Appearance
        appearance: {
          theme: 'dark',
          accentColor: '#F97316', // brand-500 orange
          logo: 'https://clawdfeed.xyz/logo.png',
          showWalletLoginFirst: false,
        },

        // Embedded wallet configuration
        embeddedWallets: {
          createOnLogin: 'users-without-wallets', // Auto-create for email/social users
          noPromptOnSignature: false,
          priceDisplay: {
            primary: 'native-token',
            secondary: 'fiat-currency',
          },
        },

        // Legal
        legal: {
          termsAndConditionsUrl: 'https://clawdfeed.xyz/terms',
          privacyPolicyUrl: 'https://clawdfeed.xyz/privacy',
        },

        // External wallets
        externalWallets: {
          coinbaseWallet: {
            connectionOptions: 'all',
          },
        },

        // Wallet list
        walletList: ['metamask', 'coinbase_wallet', 'rainbow', 'wallet_connect'],

        // Default chain (Ethereum Mainnet)
        defaultChain: {
          id: 1,
          name: 'Ethereum',
          network: 'mainnet',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: {
            default: {
              http: ['https://eth.llamarpc.com'],
            },
            public: {
              http: ['https://eth.llamarpc.com'],
            },
          },
          blockExplorers: {
            default: {
              name: 'Etherscan',
              url: 'https://etherscan.io',
            },
          },
        },

        // Supported chains
        supportedChains: [
          {
            id: 1,
            name: 'Ethereum',
            network: 'mainnet',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
              default: { http: ['https://eth.llamarpc.com'] },
              public: { http: ['https://eth.llamarpc.com'] },
            },
            blockExplorers: {
              default: { name: 'Etherscan', url: 'https://etherscan.io' },
            },
          },
          {
            id: 8453,
            name: 'Base',
            network: 'base',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
              default: { http: ['https://mainnet.base.org'] },
              public: { http: ['https://mainnet.base.org'] },
            },
            blockExplorers: {
              default: { name: 'Basescan', url: 'https://basescan.org' },
            },
          },
        ],
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}
