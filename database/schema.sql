-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Users table (supports both username/password and Google OAuth authentication)
create table public.users (
  id uuid default uuid_generate_v4 () primary key,
  username text unique not null,
  password_hash text, -- nullable for Google OAuth users
  google_id text unique, -- Google OAuth user ID
  email text, -- user email (for Google OAuth and future features)
  avatar_url text, -- profile picture URL
  auth_provider text default 'password' not null, -- 'password' or 'google'
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null
);

-- Decks table
create table public.decks (
  id uuid default uuid_generate_v4 () primary key,
  title text not null check (length(title) <= 50),
  description text check (
    description is null
    or length(description) <= 150
  ),
  visibility text default 'private' not null, -- 'private', 'public', 'shared'
  share_id text unique,
  owner_id uuid references public.users (id) on delete cascade not null,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null
);

-- Flashcards table
create table public.flashcards (
  id uuid default uuid_generate_v4 () primary key,
  deck_id uuid references public.decks (id) on delete cascade not null,
  front text not null check (length(front) <= 150),
  back text not null check (length(back) <= 150),
  position integer not null,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null
);

-- Deck duplications table - tracks which users have duplicated which shared decks
create table public.deck_duplications (
  id uuid default uuid_generate_v4 () primary key,
  user_id uuid references public.users (id) on delete cascade not null,
  original_deck_id uuid references public.decks (id) on delete cascade not null,
  duplicated_deck_id uuid references public.decks (id) on delete cascade not null,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null,
  unique (user_id, original_deck_id) -- Prevent duplicate duplications of the same deck by the same user
);

-- Saved decks table - tracks which users have saved which shared decks
create table public.saved_decks (
  id uuid default uuid_generate_v4 () primary key,
  user_id uuid references public.users (id) on delete cascade not null,
  deck_id uuid references public.decks (id) on delete cascade not null,
  saved_at timestamp with time zone default timezone ('utc'::text, now()) not null,
  unique (user_id, deck_id) -- Prevent duplicate saves of the same deck by the same user
);

-- Create indexes for better performance
create index users_username_idx on public.users (username);

create index users_google_id_idx on public.users (google_id);

create index users_email_idx on public.users (email);

create index decks_owner_id_idx on public.decks (owner_id);

create index decks_share_id_idx on public.decks (share_id);

create index flashcards_deck_id_idx on public.flashcards (deck_id);

create index deck_duplications_user_id_idx on public.deck_duplications (user_id);

create index deck_duplications_original_deck_id_idx on public.deck_duplications (original_deck_id);

create index deck_duplications_duplicated_deck_id_idx on public.deck_duplications (duplicated_deck_id);

create index saved_decks_user_id_idx on public.saved_decks (user_id);

create index saved_decks_deck_id_idx on public.saved_decks (deck_id);

-- Enable Row Level Security
alter table public.users enable row level security;

alter table public.decks enable row level security;

alter table public.flashcards enable row level security;

alter table public.deck_duplications enable row level security;

alter table public.saved_decks enable row level security;

-- Grant necessary permissions to roles
grant usage on schema public to anon,
authenticated,
service_role;

grant all privileges on table public.users to anon,
authenticated,
service_role;

grant all privileges on table public.decks to anon,
authenticated,
service_role;

grant all privileges on table public.flashcards to anon,
authenticated,
service_role;

grant all privileges on table public.deck_duplications to anon,
authenticated,
service_role;

grant all privileges on table public.saved_decks to anon,
authenticated,
service_role;

grant all privileges on all sequences in schema public to anon,
authenticated,
service_role;

-- RLS Policies for users table
-- Allow service role to bypass RLS (for API operations)
create policy "Service role can manage users" on public.users for all using (auth.role () = 'service_role');

-- Allow authenticated users to manage their own data
create policy "Users can manage own data" on public.users for all using (true);

-- RLS Policies for decks table
create policy "Service role can manage decks" on public.decks for all using (auth.role () = 'service_role');

create policy "Users can manage own decks" on public.decks for all using (true);

-- RLS Policies for flashcards table
create policy "Service role can manage flashcards" on public.flashcards for all using (auth.role () = 'service_role');

create policy "Users can manage own flashcards" on public.flashcards for all using (true);

-- RLS Policies for deck_duplications table
create policy "Service role can manage deck duplications" on public.deck_duplications for all using (auth.role () = 'service_role');

create policy "Users can manage own deck duplications" on public.deck_duplications for all using (true);

-- RLS Policies for saved_decks table
create policy "Service role can manage saved decks" on public.saved_decks for all using (auth.role () = 'service_role');

create policy "Users can manage own saved decks" on public.saved_decks for all using (true);