-- Instagram Clone Schema (Idempotent Version)

-- Create a table for public profiles
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  website text,
  updated_at timestamp with time zone
);

-- Set up Row Level Security (RLS) for profiles
alter table profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Create a table for posts
create table if not exists posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  image_url text not null,
  media_type text default 'image',
  caption text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table posts enable row level security;
drop policy if exists "Posts are viewable by everyone." on posts;
create policy "Posts are viewable by everyone." on posts for select using (true);
drop policy if exists "Users can insert their own posts." on posts;
create policy "Users can insert their own posts." on posts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own posts." on posts;
create policy "Users can update their own posts." on posts for update using (auth.uid() = user_id);
drop policy if exists "Users can delete their own posts." on posts;
create policy "Users can delete their own posts." on posts for delete using (auth.uid() = user_id);

-- Create a table for likes
create table if not exists likes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  post_id uuid references posts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, post_id)
);

alter table likes enable row level security;
drop policy if exists "Likes are viewable by everyone." on likes;
create policy "Likes are viewable by everyone." on likes for select using (true);
drop policy if exists "Users can insert their own likes." on likes;
create policy "Users can insert their own likes." on likes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own likes." on likes;
create policy "Users can delete their own likes." on likes for delete using (auth.uid() = user_id);

-- Create a table for comments
create table if not exists comments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  post_id uuid references posts(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table comments enable row level security;
drop policy if exists "Comments are viewable by everyone." on comments;
create policy "Comments are viewable by everyone." on comments for select using (true);
drop policy if exists "Users can insert their own comments." on comments;
create policy "Users can insert their own comments." on comments for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own comments." on comments;
create policy "Users can update their own comments." on comments for update using (auth.uid() = user_id);
drop policy if exists "Users can delete their own comments." on comments;
create policy "Users can delete their own comments." on comments for delete using (auth.uid() = user_id);

-- Create a table for stories
create table if not exists stories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  image_url text not null,
  media_type text default 'image',
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '24 hours') not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table stories enable row level security;
drop policy if exists "Stories are viewable by everyone." on stories;
create policy "Stories are viewable by everyone." on stories for select using (true);
drop policy if exists "Users can insert their own stories." on stories;
create policy "Users can insert their own stories." on stories for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own stories." on stories;
create policy "Users can delete their own stories." on stories for delete using (auth.uid() = user_id);

-- Create follows table
create table if not exists follows (
  follower_id uuid references profiles(id) not null,
  following_id uuid references profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

alter table follows enable row level security;
drop policy if exists "Follows are viewable by everyone." on follows;
create policy "Follows are viewable by everyone." on follows for select using (true);
drop policy if exists "Users can insert their own follows." on follows;
create policy "Users can insert their own follows." on follows for insert with check (auth.uid() = follower_id);
drop policy if exists "Users can delete their own follows." on follows;
create policy "Users can delete their own follows." on follows for delete using (auth.uid() = follower_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, split_part(new.email, '@', 1) || '_' || floor(random() * 1000)::text, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Setup Storage for Post Images
insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict (id) do nothing;
drop policy if exists "Post images are viewable by everyone" on storage.objects;
create policy "Post images are viewable by everyone" on storage.objects for select using (bucket_id = 'posts');
drop policy if exists "Users can upload post images" on storage.objects;
create policy "Users can upload post images" on storage.objects for insert with check (bucket_id = 'posts' and auth.role() = 'authenticated');
drop policy if exists "Users can update own post images" on storage.objects;
create policy "Users can update own post images" on storage.objects for update using (bucket_id = 'posts' and auth.role() = 'authenticated');
drop policy if exists "Users can delete own post images" on storage.objects;
create policy "Users can delete own post images" on storage.objects for delete using (bucket_id = 'posts' and auth.role() = 'authenticated');
