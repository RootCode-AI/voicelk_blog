-- Listening evaluation schema for VoiceLK.
-- Run once in the Supabase SQL editor (Dashboard > SQL Editor > New query). It is
-- idempotent, so running it again after an edit is safe.
--
-- Only the blog API touches these tables, through the service-role key. Row level
-- security is switched on with no policies, so the public anon key can read or
-- write nothing here even if it leaks.

-- Accounts that may upload clips to the evaluation console. Blog administrators
-- (still in MongoDB) can use the console too and are the ones who manage these.
create table if not exists public.evaluators (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email) and char_length(email) <= 200),
  name          text not null default '' check (char_length(name) <= 120),
  password_hash text not null,
  created_by    text not null default '',
  created_at    timestamptz not null default now()
);

-- One synthesised clip and the text it was rendered from.
create table if not exists public.evaluation_samples (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null check (char_length(title) between 1 and 200),
  transcript          text not null check (char_length(transcript) between 1 and 20000),
  transcript_filename text not null default '',
  -- Which model or checkpoint produced the clip. Shown to the team, never to raters.
  system              text not null default '' check (char_length(system) <= 120),
  audio_path          text not null unique,
  audio_filename      text not null,
  audio_type          text not null,
  audio_size          integer not null check (audio_size > 0 and audio_size <= 10485760),
  active              boolean not null default true,
  uploaded_by         text not null,
  uploaded_by_role    text not null check (uploaded_by_role in ('admin', 'evaluator')),
  uploaded_by_id      text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- One listener's judgement of one clip. The unique key is what limits each IP
-- address to a single response per clip; the address itself is never stored,
-- only a keyed one-way hash of it.
create table if not exists public.evaluation_feedback (
  id          uuid primary key default gen_random_uuid(),
  sample_id   uuid not null references public.evaluation_samples (id) on delete cascade,
  ip_hash     text not null,
  overall     smallint not null check (overall between 1 and 5),
  clarity     smallint not null check (clarity between 1 and 5),
  naturalness smallint not null check (naturalness between 1 and 5),
  passed      boolean not null,
  comment     text not null default '' check (char_length(comment) <= 2000),
  created_at  timestamptz not null default now(),
  constraint evaluation_feedback_one_per_ip unique (sample_id, ip_hash)
);

create index if not exists evaluation_samples_active_created_idx on public.evaluation_samples (active, created_at desc);
create index if not exists evaluation_feedback_ip_idx on public.evaluation_feedback (ip_hash);

alter table public.evaluators          enable row level security;
alter table public.evaluation_samples  enable row level security;
alter table public.evaluation_feedback enable row level security;

-- Audio bucket. Public so the listening page can stream clips directly; uploads
-- still need a signed URL from the API. Supabase itself rejects anything over
-- 10 MB or of a type not listed here, whatever the browser sends. The list must
-- match AUDIO_TYPES in shared/evaluation.js (a test checks it).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evaluation-audio', 'evaluation-audio', true, 10485760,
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg',
        'audio/webm', 'audio/flac', 'audio/x-flac', 'audio/mp4', 'audio/x-m4a', 'audio/aac']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
