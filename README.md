# Tooma 

An application that enables users to make mobile money payments and fund wallets across multiple African countries using the Aptos blockchain. This app provides a seamless interface for both outgoing payments (Pay) and wallet funding (Fund Wallet) with real-time payment validation and status tracking.

## Features

### Payment Capabilities
- **Mobile Money Payments**: Support for major mobile networks across Kenya, Uganda, Ghana, DRC, and Ethiopia
- **Multiple Payment Types**: 
  - Direct mobile payments
  - Paybill payments (with account numbers)
  - Buy goods payments
- **Real-time Validation**: Phone number and payment method validation with debounced API calls
- **Payment Status Tracking**: Real-time monitoring of transaction status with automatic polling

### Wallet Integration
- **Aptos Wallet Adapter**: Full integration with the Aptos ecosystem
- **Multi-wallet Support**: Compatible with various Aptos wallets
- **Telegram Integration**: Support for Telegram mini-app deployment
- **Account Creation**: Automated wallet account creation and management

### Supported Countries & Networks
- **Kenya (KES)**: Safaricom, Airtel
- **Uganda (UGX)**: MTN, Airtel  
- **Ghana (GHS)**: MTN, AirtelTigo
- **DRC (CDF)**: Airtel Money, Orange Money
- **Ethiopia (ETB)**: Telebirr, Cbe Birr

### User Experience
- **Dark/Light Theme**: Theme toggle with system preference detection
- **Responsive Design**: Mobile-first responsive interface
- **Real-time Updates**: Live payment status updates and transaction history
- **Smooth Animations**: Framer Motion animations and transitions

## Tech Stack

### Frontend Framework
- **Next.js 15.5.4** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.8.3** - Type safety

### Blockchain Integration
- **@aptos-labs/ts-sdk** - Aptos blockchain SDK
- **@aptos-labs/wallet-adapter-react** - Wallet connection and management
- **@aptos-labs/wallet-standard** - Standard wallet interface
- **@hyperionxyz/sdk** - Additional blockchain utilities

### UI Components & Styling
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components built on Radix UI
- **Radix UI** - Primitive components for accessibility and behavior
- **Lucide React** - Icon library
- **Framer Motion 12.23.22** - Animation library

### State Management & Data Fetching
- **TanStack Query 5.59.16** - Server state management
- **React Query** - Data fetching and caching

### Additional Libraries
- **next-themes** - Theme management
- **date-fns** - Date manipulation
- **clsx & tailwind-merge** - Conditional styling utilities
- **sonner** - Toast notifications

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Autoprefixer** - CSS vendor prefixing

### Blockchain (Move)
- **Aptos Framework** - Smart contract framework for Move language

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── actions/           # Server actions for payments and conversions
│   ├── api/               # API routes for external services
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── payment/           # Payment-specific components
│   ├── wallet/            # Wallet-related components
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
└── utils/                 # Helper functions and configurations

move/                      # Move smart contracts
├── Move.toml             # Move package configuration
└── scripts/              # Move scripts
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm, npm, or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nextjs-example
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
# or
yarn install
```

3. Run the development server:
```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

4. Open [https://localhost:3000](https://localhost:3000) in your browser.

### Environment Setup

The application runs with HTTPS enabled by default for security and wallet compatibility. SSL certificates are included in the `certificates/` directory for local development.

## Usage

### For End Users
1. **Connect Wallet**: Click the wallet selector to connect your Aptos wallet
2. **Choose Payment Type**: 
   - Select "Pay" to send money to mobile numbers
   - Select "Fund Wallet" to add money to your account
3. **Select Country**: Choose your country to see available mobile networks
4. **Enter Details**: Fill in phone number, amount, and payment method
5. **Confirm Transaction**: Review and confirm your payment
6. **Track Status**: Monitor real-time payment status updates

### For Developers

#### Adding New Mobile Networks
Update the `MOBILE_NETWORKS` object in `src/components/payment/Payment.tsx`:

```typescript
const MOBILE_NETWORKS = {
  KES: ["Safaricom", "Airtel"],
  // Add new country/networks here
} as const;
```

#### Integrating into Your App

If you want to add the shadcn/ui Aptos wallet selector to your app:

1. Install shadcn/ui components:
```bash
npx shadcn@latest add button collapsible dialog dropdown-menu toast
```

2. Copy the wallet components from this repo:
- `src/components/WalletSelector.tsx`
- `src/components/WalletProvider.tsx`

3. Wrap your app with the `WalletProvider` component
4. Use `<WalletSelector />` where you want the connect button

## API Integration

The application integrates with external payment APIs for:
- Phone number validation
- Payment processing  
- Exchange rate fetching
- Transaction status monitoring

API endpoints are configured in `src/app/api/` directory.

## Security Features

- HTTPS enforcement for secure connections
- Input validation and sanitization
- Secure wallet connection protocols
- Environment-based configuration management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and formatting:
```bash
npm run lint
npm run format
```
5. Submit a pull request

## License

Apache-2.0

## Support

For issues and questions, please refer to the project's issue tracker or documentation.