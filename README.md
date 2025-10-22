# Haroval

A modern, professional flashcard application built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Multiple Authentication Options** - Username/password and Google OAuth
- **Deck Management** - Create, edit, and organize flashcard decks
- **Study Mode** - Beautiful, distraction-free study interface
- **Sharing** - Share decks with unique links
- **Responsive Design** - Works perfectly on all devices
- **Password Security** - Bcrypt hashing for secure password storage
- **Google OAuth Integration** - Quick and secure login with Google
- **Token Encryption** - AES-256-GCM encryption for JWT tokens in cookies

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom username/password with bcrypt + Google OAuth
- **Encryption**: AES-256-GCM for JWT token encryption
- **Icons**: Lucide React
- **Deployment**: Vercel

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/nocturnal625/Haroval
cd Haroval
yarn install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** and copy your credentials
3. Create `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here

# Google OAuth Configuration (Optional)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Encryption Key (Required - generate with: node scripts/generate-encryption-key.js)
ENCRYPTION_KEY=your_32_byte_base64_encryption_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For development
# NEXT_PUBLIC_APP_URL=https://haroval.vercel.app  # For production
```

### 3. Generate Encryption Key

1. Generate a secure encryption key:
   ```bash
   node scripts/generate-encryption-key.js
   ```
2. Copy the generated key and add it to your `.env.local` file as `ENCRYPTION_KEY=your_key_here`

### 4. Set up Database Schema

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `database/schema.sql`
4. Click **Run** to create all tables and policies

### 5. Set up Google OAuth (Optional)

If you want to enable Google OAuth login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Choose "Web application"
6. Configure the following:

**Authorized JavaScript Origins:**
- Development: `http://localhost:3000`
- Production: `https://haroval.vercel.app`

**Authorized Redirect URIs:**
- Development: `http://localhost:3000/api/auth/google/callback`
- Production: `https://haroval.vercel.app/api/auth/google/callback`

7. Copy your Client ID and Client Secret to your `.env.local` file

**Environment Variables Reference:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `SUPABASE_JWT_SECRET` - Your Supabase JWT secret
- `ENCRYPTION_KEY` - 32-byte base64 encryption key (generate with script)
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret (optional)
- `NEXT_PUBLIC_APP_URL` - Your app URL (for OAuth redirects)

### 6. Start Development

```bash
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## Security Features

### Token Encryption
This application uses **AES-256-GCM encryption** for JWT tokens stored in HTTP-only cookies:

- **JWT tokens are encrypted** before being stored in cookies
- **AES-256-GCM** provides authenticated encryption with integrity protection
- **Random IVs** prevent pattern analysis attacks
- **Auth tags** ensure data hasn't been tampered with
- **Base64 encoding** for safe cookie storage

The encryption is transparent to the application - all functionality works the same, but with enhanced security.

## Manual Database Setup

The database schema is located in `database/schema.sql`. This file contains:

- **Tables**: users, decks, flashcards
- **Row Level Security (RLS)**: Secure data access policies
- **Indexes**: Optimized database performance
- **Permissions**: Proper role-based access control
- **Authentication**: Username/password system with bcrypt + Google OAuth support

Simply run this SQL in your Supabase SQL Editor to set up the complete database structure.

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

The app will automatically build and deploy to your Vercel domain.

## Development

```bash
# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Lint code
yarn lint
```

## Project Structure

```
haroval/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Landing page
│   ├── api/auth/          # Authentication API routes
│   │   ├── google/        # Google OAuth routes
│   │   └── google/callback/ # OAuth callback handler
│   ├── deck/[deckId]/     # Study pages
│   └── shared/[shareId]/  # Shared deck pages
├── lib/                   # Utility libraries
│   ├── supabase/          # Supabase client configuration
│   ├── auth.ts            # Authentication hook
│   ├── cache.ts           # Caching system
│   ├── encryption.ts      # AES-256-GCM encryption utilities
│   ├── google-auth.ts     # Google OAuth utilities
│   └── jwt.ts             # JWT token management
├── database/
│   ├── schema.sql         # Complete database schema
└── public/                # Static assets
    └── icons/             # Website icons
```

## License

MIT License - see LICENSE file for details
A web application for creating, managing, and sharing customized flashcards for study purposes.
