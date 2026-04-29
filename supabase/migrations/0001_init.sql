-- BrainHack Bingo schema
-- RLS is intentionally disabled (matches sister hackathon apps).
-- Soft access control: team token in URL (client) + ADMIN_PASSCODE check (Edge Functions for writes that matter).

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  colour text not null check (colour in ('red','blue','green','yellow')),
  token text unique not null,
  created_at timestamptz not null default now()
);

create table bingo_squares (
  id uuid primary key default gen_random_uuid(),
  position int unique not null check (position between 0 and 15),
  category text not null check (category in ('orange','blue','grey','wild')),
  title text not null,
  description text not null,
  verification_kind text not null check (verification_kind in (
    'scan_team',
    'scan_team_with_answer',
    'photo_with_team',
    'photo_auto',
    'photo_mentor',
    'ig_url_mentor',
    'booth_qr'
  )),
  enforce_colour_distinct boolean not null default false
);

create table square_completions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  square_id uuid not null references bingo_squares(id) on delete cascade,
  status text not null default 'approved' check (status in ('pending','approved','rejected')),
  scanned_team_id uuid references teams(id) on delete set null,
  text_answer text,
  photo_path text,
  ig_url text,
  approved_by_mentor text,
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  unique (team_id, square_id)
);
create index square_completions_team_idx on square_completions(team_id);
create index square_completions_pending_idx on square_completions(status) where status = 'pending';

create table mentor_actions (
  id uuid primary key default gen_random_uuid(),
  mentor_name text not null,
  action text not null check (action in (
    'approve','reject','draw','open_game','close_game','regen_token','create_team'
  )),
  completion_id uuid references square_completions(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index mentor_actions_recent_idx on mentor_actions(created_at desc);

create table code_submissions (
  team_id uuid primary key references teams(id) on delete cascade,
  github_url text not null,
  github_is_public boolean,
  github_check_response jsonb,
  zip_storage_path text,
  zip_clean boolean,
  zip_check_response jsonb,
  updated_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  completion_id uuid references square_completions(id) on delete set null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index photos_recent_idx on photos(created_at desc);

create table game_state (
  id int primary key default 1 check (id = 1),
  is_open boolean not null default false,
  draw_winners jsonb,
  draw_at timestamptz
);
insert into game_state (id, is_open) values (1, false);

-- Disable RLS for hackathon simplicity (matches sister projects).
alter table teams disable row level security;
alter table bingo_squares disable row level security;
alter table square_completions disable row level security;
alter table mentor_actions disable row level security;
alter table code_submissions disable row level security;
alter table photos disable row level security;
alter table game_state disable row level security;

-- Realtime: scoreboard + team home subscribe to these.
alter publication supabase_realtime add table square_completions;
alter publication supabase_realtime add table photos;
alter publication supabase_realtime add table game_state;

-- Seed the 16 bingo squares (positions are row-major, 0-indexed; row 0 is the top row).
insert into bingo_squares (position, category, title, description, verification_kind, enforce_colour_distinct) values
  (0,  'blue',   'Tech stack',           'Ask another team what tech stack they used.',                                    'scan_team_with_answer', true),
  (1,  'grey',   'Photo with a team',    'Take a team photo with another team.',                                            'photo_with_team',       false),
  (2,  'orange', 'Functional chatbot',   'Find a team that has a functional chatbot feature.',                              'scan_team',             false),
  (3,  'blue',   'What makes you unique','Ask another team what makes their solution unique.',                              'scan_team_with_answer', true),
  (4,  'orange', 'Dark mode',            'Find a team that implemented dark mode.',                                         'scan_team',             false),
  (5,  'grey',   'Photo with a mentor',  'Take a team photo with a mentor.',                                                'photo_mentor',          false),
  (6,  'grey',   'Photo on stage',       'Take a team photo on stage.',                                                     'photo_mentor',          false),
  (7,  'blue',   'Biggest challenge',    'Ask another team what their biggest challenge has been.',                         'scan_team_with_answer', true),
  (8,  'wild',   'Show off your project','Upload a team selfie with your project to claim the wild card.',                  'photo_auto',            false),
  (9,  'grey',   'IG post #BH26',        'Post a picture or story on Instagram with the BH26 hashtag, then paste the link.', 'ig_url_mentor',         false),
  (10, 'grey',   'Visit Deepfake booth', 'Visit the Deepfake booth at the tech showcase and scan its QR poster.',           'booth_qr',              false),
  (11, 'orange', 'Authentication',       'Find a team that implemented authentication / login.',                            'scan_team',             false),
  (12, 'orange', 'Testing',              'Find a team that did testing (e.g. shows test data / test cases).',               'scan_team',             false),
  (13, 'orange', 'Proper logging',       'Find a team that has proper logging (info / warning / error).',                   'scan_team',             false),
  (14, 'blue',   'Feature you''re proud of', 'Ask another team what feature they''re most proud of.',                       'scan_team_with_answer', true),
  (15, 'orange', 'User onboarding',      'Find a team that has a user onboarding / tutorial feature.',                      'scan_team',             false);
