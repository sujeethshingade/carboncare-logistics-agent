-- sidebar

create extension if not exists "uuid-ossp";

-- create tables
create table chat_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table messages (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references chat_sessions(id) on delete cascade not null,
  type text check (type in ('user', 'agent')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table session_files (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references chat_sessions(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- enable RLS
alter table chat_sessions enable row level security;
alter table messages enable row level security;
alter table session_files enable row level security;

-- policies for chat_sessions
create policy "Users can view their own chat sessions"
  on chat_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own chat sessions"
  on chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own chat sessions"
  on chat_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own chat sessions"
  on chat_sessions for delete
  using (auth.uid() = user_id);

-- policies for messages
create policy "Users can view messages from their sessions"
  on messages for select
  using (
    session_id in (
      select id from chat_sessions where user_id = auth.uid()
    )
  );

create policy "Users can insert messages to their sessions"
  on messages for insert
  with check (
    session_id in (
      select id from chat_sessions where user_id = auth.uid()
    )
  );

-- policies for session_files
create policy "Users can view files from their sessions"
  on session_files for select
  using (
    session_id in (
      select id from chat_sessions where user_id = auth.uid()
    )
  );

create policy "Users can insert files to their sessions"
  on session_files for insert
  with check (
    session_id in (
      select id from chat_sessions where user_id = auth.uid()
    )
  );

create policy "Users can delete their session files"
  on session_files for delete
  using (
    session_id in (
      select id from chat_sessions where user_id = auth.uid()
    )
  );

-- function to update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- trigger for updated_at
create trigger update_chat_sessions_updated_at
  before update on chat_sessions
  for each row
  execute function update_updated_at_column();

-- create storage bucket
insert into storage.buckets (id, name, public) 
values ('chat-files', 'chat-files', false);

-- policies for storage chat files
create policy "Users can upload their own files"
  on storage.objects for insert
  with check (
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Users can view their own files"
  on storage.objects for select
  using (
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Users can delete their own files"
  on storage.objects for delete
  using (
    auth.uid() = (storage.foldername(name))[1]::uuid
  );


--dashboard

-- create table
create table public.sustainability_analytics (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  timestamp timestamp with time zone not null,
  num_shipments integer not null,
  data jsonb not null,
  user_id uuid not null references auth.users(id)
);

-- enable RLS
alter table public.sustainability_analytics enable row level security;

-- policies for sustainability_analytics
create policy "Allow authenticated users to read their own analytics"
  on public.sustainability_analytics
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Allow authenticated users to insert their own analytics"
  on public.sustainability_analytics
  for insert
  to authenticated
  with check (user_id = auth.uid());