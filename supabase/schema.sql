begin;
create schema if not exists lets_unpack_private;
revoke all on schema lets_unpack_private from public;
grant usage on schema lets_unpack_private to authenticated;
create table public.learners (id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.concepts (id smallint primary key, title text not null unique);
create table public.case_questions (id integer primary key, concept_id smallint not null references public.concepts(id), prompt text not null, answer_core text not null, aliases jsonb not null, required_groups jsonb, patterns jsonb not null default '[]', answer_reason text not null);
create index case_questions_concept_idx on public.case_questions(concept_id);
create table public.attempts (id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.learners(id) on delete cascade, concept_id smallint not null references public.concepts(id), explanation text not null check(length(explanation) between 1 and 5000), case_question_id integer references public.case_questions(id), case_answer text check(length(case_answer) between 1 and 5000), passed boolean, created_at timestamptz not null default now(), graded_at timestamptz, check ((graded_at is null and passed is null and case_answer is null) or (graded_at is not null and passed is not null and case_answer is not null and case_question_id is not null)));
create index attempts_learner_time_idx on public.attempts(learner_id,created_at desc);
create index attempts_concept_idx on public.attempts(concept_id);
create index attempts_case_idx on public.attempts(case_question_id);
create table public.gaps (id uuid primary key default gen_random_uuid(), attempt_id uuid not null unique references public.attempts(id) on delete cascade, sentence text not null, follow_up text not null, created_at timestamptz not null default now());
create table public.retries (id uuid primary key default gen_random_uuid(), gap_id uuid not null references public.gaps(id) on delete cascade, sequence smallint not null check(sequence between 1 and 2), answer text not null check(length(answer) between 1 and 5000), created_at timestamptz not null default now(), unique(gap_id,sequence));
alter table public.learners enable row level security;
alter table public.concepts enable row level security;
alter table public.case_questions enable row level security;
alter table public.attempts enable row level security;
alter table public.gaps enable row level security;
alter table public.retries enable row level security;
revoke all on public.learners,public.concepts,public.case_questions,public.attempts,public.gaps,public.retries from anon,authenticated;
grant select on public.learners,public.concepts,public.attempts,public.gaps,public.retries to authenticated;
create policy learners_read_own on public.learners for select to authenticated using (id=(select auth.uid()));
create policy concepts_read on public.concepts for select to authenticated using (true);
create policy attempts_read_own on public.attempts for select to authenticated using (learner_id=(select auth.uid()));
create policy gaps_read_own on public.gaps for select to authenticated using (exists(select 1 from public.attempts a where a.id=attempt_id and a.learner_id=(select auth.uid())));
create policy retries_read_own on public.retries for select to authenticated using (exists(select 1 from public.gaps g join public.attempts a on a.id=g.attempt_id where g.id=gap_id and a.learner_id=(select auth.uid())));
create policy case_questions_deny_direct on public.case_questions for all to anon, authenticated using(false) with check(false);
-- No browser grants on case_questions: answer keys remain private.
create function lets_unpack_private.normalize_answer(s text) returns text language sql immutable set search_path='' as $$ select trim(regexp_replace(lower(translate(s,'’‘“”–—',chr(39)||chr(39)||'""--')),'\s+',' ','g')) $$;
create function lets_unpack_private.term_matches(answer text,term text) returns boolean language sql immutable set search_path='' as $$ select position(' '||trim(regexp_replace(lets_unpack_private.normalize_answer(term),'[^[:alnum:]_]+',' ','g'))||' ' in ' '||trim(regexp_replace(lets_unpack_private.normalize_answer(answer),'[^[:alnum:]_]+',' ','g'))||' ')>0 $$;
create function lets_unpack_private.grade_core(answer text,aliases jsonb,groups jsonb,patterns jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare passed boolean; group_terms jsonb; term text; pattern text;
begin
 if groups is not null and groups<>'null'::jsonb then
  passed:=true;
  for group_terms in select value from jsonb_array_elements(groups) loop
   if not exists(select 1 from jsonb_array_elements_text(group_terms) t where lets_unpack_private.term_matches(answer,t)) then passed:=false;exit;end if;
  end loop;
 else
  select exists(select 1 from jsonb_array_elements_text(aliases) t where lets_unpack_private.term_matches(answer,t)) into passed;
 end if;
 if not passed then
  for pattern in select value from jsonb_array_elements_text(patterns) loop
   if lets_unpack_private.normalize_answer(answer) ~* replace(pattern,E'\\b',E'\\y') then return true;end if;
  end loop;
 end if;
 return passed;
end $$;
create function lets_unpack_private.start_attempt(p_id uuid,p_concept_id smallint,p_explanation text,p_sentence text,p_follow_up text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); existing public.attempts; gap public.gaps;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if length(trim(p_explanation)) not between 1 and 5000 or length(p_follow_up) not between 1 and 700 or (p_sentence<>'' and position(p_sentence in p_explanation)=0) then raise exception 'Invalid explanation or follow-up';end if;
 insert into public.learners(id) values(uid) on conflict do nothing;
 insert into public.attempts(id,learner_id,concept_id,explanation) values(p_id,uid,p_concept_id,p_explanation) on conflict(id) do nothing;
 select * into existing from public.attempts where id=p_id for update;
 if existing.learner_id<>uid then raise exception 'Attempt not found' using errcode='42501';end if;
 if existing.concept_id<>p_concept_id or existing.explanation<>p_explanation then raise exception 'Attempt input changed';end if;
 insert into public.gaps(attempt_id,sentence,follow_up) values(p_id,p_sentence,p_follow_up) on conflict(attempt_id) do nothing;
 select * into gap from public.gaps where attempt_id=p_id;
 return jsonb_build_object('attempt_id',p_id,'sentence',gap.sentence,'follow_up',gap.follow_up);
end $$;
create function lets_unpack_private.next_case(p_attempt_id uuid,p_answer text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.attempts; chosen public.case_questions; previous_id integer; v_gap_id uuid;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if length(trim(p_answer)) not between 1 and 5000 then raise exception 'Answer required';end if;
 select * into a from public.attempts where id=p_attempt_id and learner_id=uid for update;
 if not found then raise exception 'Attempt not found' using errcode='42501';end if;
 if a.graded_at is not null then raise exception 'Attempt already graded';end if;
 if a.case_question_id is null then
  select g.id into v_gap_id from public.gaps g where g.attempt_id=a.id;
  if v_gap_id is null then raise exception 'Follow-up required';end if;
  insert into public.retries(gap_id,sequence,answer) values(v_gap_id,1,p_answer) on conflict(gap_id,sequence) do nothing;
  select case_question_id into previous_id from public.attempts where learner_id=uid and concept_id=a.concept_id and id<>a.id and case_question_id is not null order by created_at desc limit 1;
  select * into chosen from public.case_questions q where q.concept_id=a.concept_id and (previous_id is null or q.id<>previous_id) order by random() limit 1;
  update public.attempts set case_question_id=chosen.id where id=a.id;
 else select * into chosen from public.case_questions where id=a.case_question_id;
 end if;
 return jsonb_build_object('case_id',chosen.id,'prompt',chosen.prompt);
end $$;
create function lets_unpack_private.attempt_record(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select jsonb_build_object('id',a.id,'concept',c.title,'date',a.created_at,'passed',a.passed,'explanation',a.explanation,'results',jsonb_build_array(jsonb_build_object('case',q.prompt,'answer',a.case_answer,'pass',a.passed,'reason',q.answer_reason))) into result from public.attempts a join public.concepts c on c.id=a.concept_id join public.case_questions q on q.id=a.case_question_id where a.id=p_attempt_id and a.learner_id=uid and a.graded_at is not null;
 if result is null then raise exception 'Completed attempt not found' using errcode='42501';end if;
 return result;
end $$;
create function lets_unpack_private.submit_answer(p_attempt_id uuid,p_answer text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.attempts; q public.case_questions; v_passed boolean;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if length(trim(p_answer)) not between 1 and 5000 then raise exception 'Answer required';end if;
 select * into a from public.attempts where id=p_attempt_id and learner_id=uid for update;
 if not found then raise exception 'Attempt not found' using errcode='42501';end if;
 if a.case_question_id is null then raise exception 'Request a case first';end if;
 if a.graded_at is null then
  select * into q from public.case_questions where id=a.case_question_id;
  v_passed:=lets_unpack_private.grade_core(p_answer,q.aliases,q.required_groups,q.patterns);
  update public.attempts set case_answer=p_answer,passed=v_passed,graded_at=now() where id=a.id;
 end if;
 return lets_unpack_private.attempt_record(a.id);
end $$;
create function lets_unpack_private.attempt_history() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select coalesce(jsonb_agg(lets_unpack_private.attempt_record(a.id) order by a.created_at desc),'[]'::jsonb) into result from (select id,created_at from public.attempts where learner_id=uid and graded_at is not null order by created_at desc limit 100) a;
 return result;
end $$;
-- Exposed wrappers do not bypass RLS; privileged logic stays in an unexposed schema.
create function public.lu_start_attempt(p_id uuid,p_concept_id smallint,p_explanation text,p_sentence text,p_follow_up text) returns jsonb language sql security invoker set search_path='' as $$ select lets_unpack_private.start_attempt(p_id,p_concept_id,p_explanation,p_sentence,p_follow_up) $$;
create function public.lu_next_case(p_attempt_id uuid,p_answer text) returns jsonb language sql security invoker set search_path='' as $$ select lets_unpack_private.next_case(p_attempt_id,p_answer) $$;
create function public.lu_submit_answer(p_attempt_id uuid,p_answer text) returns jsonb language sql security invoker set search_path='' as $$ select lets_unpack_private.submit_answer(p_attempt_id,p_answer) $$;
create function public.lu_attempt_history() returns jsonb language sql security invoker set search_path='' as $$ select lets_unpack_private.attempt_history() $$;
revoke all on all functions in schema lets_unpack_private from public,anon,authenticated;
grant execute on function lets_unpack_private.start_attempt(uuid,smallint,text,text,text),lets_unpack_private.next_case(uuid,text),lets_unpack_private.submit_answer(uuid,text),lets_unpack_private.attempt_history() to authenticated;
revoke all on function public.lu_start_attempt(uuid,smallint,text,text,text),public.lu_next_case(uuid,text),public.lu_submit_answer(uuid,text),public.lu_attempt_history() from public,anon;
grant execute on function public.lu_start_attempt(uuid,smallint,text,text,text),public.lu_next_case(uuid,text),public.lu_submit_answer(uuid,text),public.lu_attempt_history() to authenticated;
commit;

-- Before/follow-up/after flow upgrade
begin;
-- Additive upgrade: existing one-question attempts keep their original results.
alter table public.attempts add column if not exists before_case_id integer references public.case_questions(id), add column if not exists before_answer text, add column if not exists before_passed boolean, add column if not exists before_graded_at timestamptz;
create index if not exists attempts_before_case_idx on public.attempts(before_case_id);
alter table public.attempts add constraint attempts_before_result_check check ((before_answer is null and before_passed is null and before_graded_at is null) or (before_case_id is not null and before_answer is not null and length(trim(before_answer)) between 1 and 5000 and before_passed is not null and before_graded_at is not null));
create or replace function lets_unpack_private.begin_case(p_id uuid,p_concept_id smallint,p_explanation text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.attempts; q public.case_questions; previous_id integer;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_explanation is null or length(trim(p_explanation)) not between 1 and 5000 then raise exception 'Explanation required';end if;
 insert into public.learners(id) values(uid) on conflict do nothing;
 insert into public.attempts(id,learner_id,concept_id,explanation) values(p_id,uid,p_concept_id,p_explanation) on conflict(id) do nothing;
 select * into a from public.attempts where id=p_id and learner_id=uid for update;
 if not found then raise exception 'Attempt not found' using errcode='42501';end if;
 if a.concept_id<>p_concept_id or a.explanation<>p_explanation then raise exception 'Attempt input changed';end if;
 if a.before_case_id is null then
  if a.graded_at is not null or exists(select 1 from public.gaps where attempt_id=a.id) then raise exception 'Start a new attempt';end if;
  select before_case_id into previous_id from public.attempts where learner_id=uid and concept_id=a.concept_id and id<>a.id and before_case_id is not null order by created_at desc limit 1;
  select * into q from public.case_questions where concept_id=a.concept_id and (previous_id is null or id<>previous_id) order by random() limit 1;
  if q.id is null then raise exception 'Question unavailable';end if;
  update public.attempts set before_case_id=q.id where id=a.id;
 else select * into q from public.case_questions where id=a.before_case_id;
 end if;
 return jsonb_build_object('attempt_id',a.id,'case_id',q.id,'prompt',q.prompt);
end $$;
create or replace function lets_unpack_private.submit_before(p_attempt_id uuid,p_answer text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.attempts; q public.case_questions; v_passed boolean;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_answer is null or length(trim(p_answer)) not between 1 and 5000 then raise exception 'Answer required';end if;
 select * into a from public.attempts where id=p_attempt_id and learner_id=uid for update;
 if not found then raise exception 'Attempt not found' using errcode='42501';end if;
 if a.before_case_id is null then raise exception 'Request the first question first';end if;
 if a.before_graded_at is null then
  select * into q from public.case_questions where id=a.before_case_id;
  v_passed:=lets_unpack_private.grade_core(p_answer,q.aliases,q.required_groups,q.patterns);
  update public.attempts set before_answer=p_answer,before_passed=v_passed,before_graded_at=now() where id=a.id returning * into a;
 end if;
 -- Save the baseline without giving away the expected answer before the follow-up.
 return jsonb_build_object('attempt_id',a.id,'passed',a.before_passed);
end $$;
create or replace function lets_unpack_private.start_attempt(p_id uuid,p_concept_id smallint,p_explanation text,p_sentence text,p_follow_up text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); existing public.attempts; gap public.gaps;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if length(trim(p_explanation)) not between 1 and 5000 or length(p_follow_up) not between 1 and 700 or (p_sentence<>'' and position(p_sentence in p_explanation)=0) then raise exception 'Invalid explanation or follow-up';end if;
 insert into public.learners(id) values(uid) on conflict do nothing;
 insert into public.attempts(id,learner_id,concept_id,explanation) values(p_id,uid,p_concept_id,p_explanation) on conflict(id) do nothing;
 select * into existing from public.attempts where id=p_id for update;
 if existing.learner_id<>uid then raise exception 'Attempt not found' using errcode='42501';end if;
 if existing.before_case_id is not null and existing.before_graded_at is null then raise exception 'Answer the first question before the follow-up';end if;
 if existing.concept_id<>p_concept_id or existing.explanation<>p_explanation then raise exception 'Attempt input changed';end if;
 insert into public.gaps(attempt_id,sentence,follow_up) values(p_id,p_sentence,p_follow_up) on conflict(attempt_id) do nothing;
 select * into gap from public.gaps where attempt_id=p_id;
 return jsonb_build_object('attempt_id',p_id,'sentence',gap.sentence,'follow_up',gap.follow_up);
end $$;
create or replace function lets_unpack_private.next_case(p_attempt_id uuid,p_answer text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.attempts; chosen public.case_questions; previous_id integer; v_gap_id uuid;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if length(trim(p_answer)) not between 1 and 5000 then raise exception 'Answer required';end if;
 select * into a from public.attempts where id=p_attempt_id and learner_id=uid for update;
 if not found then raise exception 'Attempt not found' using errcode='42501';end if;
 if a.before_case_id is not null and a.before_graded_at is null then raise exception 'Answer the first question first';end if;
 if a.graded_at is not null then raise exception 'Attempt already graded';end if;
 if a.case_question_id is null then
  select g.id into v_gap_id from public.gaps g where g.attempt_id=a.id;
  if v_gap_id is null then raise exception 'Follow-up required';end if;
  insert into public.retries(gap_id,sequence,answer) values(v_gap_id,1,p_answer) on conflict(gap_id,sequence) do nothing;
  select case_question_id into previous_id from public.attempts where learner_id=uid and concept_id=a.concept_id and id<>a.id and case_question_id is not null order by created_at desc limit 1;
  select * into chosen from public.case_questions q where q.concept_id=a.concept_id and (a.before_case_id is null or q.id<>a.before_case_id) and (previous_id is null or q.id<>previous_id) order by random() limit 1;
  if chosen.id is null then select * into chosen from public.case_questions q where q.concept_id=a.concept_id and (a.before_case_id is null or q.id<>a.before_case_id) order by random() limit 1;end if;
  if chosen.id is null then raise exception 'A different question is not available';end if;
  update public.attempts set case_question_id=chosen.id where id=a.id;
 else select * into chosen from public.case_questions where id=a.case_question_id;
 end if;
 return jsonb_build_object('case_id',chosen.id,'prompt',chosen.prompt);
end $$;
create or replace function lets_unpack_private.attempt_record(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select jsonb_build_object('id',a.id,'concept',c.title,'date',a.created_at,'passed',a.passed,'explanation',a.explanation,'before_passed',a.before_passed,'improved',case when a.before_passed is not null then not a.before_passed and a.passed else null end,'results',case when a.before_case_id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('phase','before','case',b.prompt,'answer',a.before_answer,'pass',a.before_passed)) end || jsonb_build_array(jsonb_build_object('phase','after','case',q.prompt,'answer',a.case_answer,'pass',a.passed,'reason',q.answer_reason))) into result from public.attempts a join public.concepts c on c.id=a.concept_id join public.case_questions q on q.id=a.case_question_id left join public.case_questions b on b.id=a.before_case_id where a.id=p_attempt_id and a.learner_id=uid and a.graded_at is not null;
 if result is null then raise exception 'Completed attempt not found' using errcode='42501';end if;
 return result;
end $$;
create or replace function public.lu_begin_case(p_id uuid,p_concept_id smallint,p_explanation text) returns jsonb language sql security invoker set search_path='' as $$ select lets_unpack_private.begin_case(p_id,p_concept_id,p_explanation) $$;
create or replace function public.lu_submit_before(p_attempt_id uuid,p_answer text) returns jsonb language sql security invoker set search_path='' as $$ select lets_unpack_private.submit_before(p_attempt_id,p_answer) $$;
revoke all on function lets_unpack_private.begin_case(uuid,smallint,text),lets_unpack_private.submit_before(uuid,text),public.lu_begin_case(uuid,smallint,text),public.lu_submit_before(uuid,text) from public,anon;
grant execute on function lets_unpack_private.begin_case(uuid,smallint,text),lets_unpack_private.submit_before(uuid,text),public.lu_begin_case(uuid,smallint,text),public.lu_submit_before(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;

-- Final case explanations and follow-up feedback
begin;
alter table public.gaps add column if not exists feedback text check(feedback is null or length(trim(feedback)) between 1 and 1200);
create or replace function lets_unpack_private.attempt_record(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select jsonb_build_object('id',a.id,'concept',c.title,'date',a.created_at,'passed',a.passed,'explanation',a.explanation,'follow_up',case when g.id is null then null else jsonb_build_object('question',g.follow_up,'answer',r.answer,'feedback',g.feedback) end,'before_passed',a.before_passed,'improved',case when a.before_passed is not null then not a.before_passed and a.passed else null end,'results',case when a.before_case_id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('phase','before','case',b.prompt,'answer',a.before_answer,'pass',a.before_passed,'reason',b.answer_reason)) end || jsonb_build_array(jsonb_build_object('phase','after','case',q.prompt,'answer',a.case_answer,'pass',a.passed,'reason',q.answer_reason))) into result from public.attempts a join public.concepts c on c.id=a.concept_id join public.case_questions q on q.id=a.case_question_id left join public.case_questions b on b.id=a.before_case_id left join public.gaps g on g.attempt_id=a.id left join public.retries r on r.gap_id=g.id and r.sequence=1 where a.id=p_attempt_id and a.learner_id=uid and a.graded_at is not null;
 if result is null then raise exception 'Completed attempt not found' using errcode='42501';end if;
 return result;
end $$;

create or replace function lets_unpack_private.save_follow_up_feedback(p_attempt_id uuid,p_feedback text) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); v_gap_id uuid; saved text;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_feedback is null or length(trim(p_feedback)) not between 1 and 1200 then raise exception 'Invalid feedback';end if;
 select g.id,g.feedback into v_gap_id,saved from public.gaps g join public.attempts a on a.id=g.attempt_id where a.id=p_attempt_id and a.learner_id=uid and a.graded_at is not null for update of g;
 if not found then raise exception 'Completed attempt not found' using errcode='42501';end if;
 if saved is null then update public.gaps set feedback=trim(p_feedback) where id=v_gap_id returning feedback into saved;end if;
 return saved;
end $$;
create or replace function public.lu_attempt_review(p_attempt_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select lets_unpack_private.attempt_record(p_attempt_id) $$;
create or replace function public.lu_save_follow_up_feedback(p_attempt_id uuid,p_feedback text) returns text language sql security invoker set search_path='' as $$ select lets_unpack_private.save_follow_up_feedback(p_attempt_id,p_feedback) $$;
revoke all on function lets_unpack_private.save_follow_up_feedback(uuid,text),public.lu_attempt_review(uuid),public.lu_save_follow_up_feedback(uuid,text) from public,anon;
grant execute on function lets_unpack_private.attempt_record(uuid),lets_unpack_private.save_follow_up_feedback(uuid,text),public.lu_attempt_review(uuid),public.lu_save_follow_up_feedback(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;

begin;
alter table public.attempts add column if not exists completed_after_first boolean not null default false;
create or replace function lets_unpack_private.attempt_record(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select jsonb_build_object('id',a.id,'concept',c.title,'date',a.created_at,'passed',a.passed,'completed_after_first',a.completed_after_first,'explanation',a.explanation,'follow_up',case when g.id is null then null else jsonb_build_object('question',g.follow_up,'answer',r.answer,'feedback',g.feedback) end,'before_passed',a.before_passed,'improved',case when a.before_passed is not null then not a.before_passed and a.passed else null end,'results',case when a.before_case_id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('phase','before','case',b.prompt,'answer',a.before_answer,'pass',a.before_passed,'reason',b.answer_reason)) end || case when a.completed_after_first then '[]'::jsonb else jsonb_build_array(jsonb_build_object('phase','after','case',q.prompt,'answer',a.case_answer,'pass',a.passed,'reason',q.answer_reason)) end) into result from public.attempts a join public.concepts c on c.id=a.concept_id join public.case_questions q on q.id=a.case_question_id left join public.case_questions b on b.id=a.before_case_id left join public.gaps g on g.attempt_id=a.id left join public.retries r on r.gap_id=g.id and r.sequence=1 where a.id=p_attempt_id and a.learner_id=uid and a.graded_at is not null;
 if result is null then raise exception 'Completed attempt not found' using errcode='42501';end if;
 return result;
end $$;

create or replace function lets_unpack_private.submit_first(p_attempt_id uuid,p_answer text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.attempts; q public.case_questions; v_passed boolean;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_answer is null or length(trim(p_answer)) not between 1 and 5000 then raise exception 'Answer required';end if;
 select * into a from public.attempts where id=p_attempt_id and learner_id=uid for update;
 if not found then raise exception 'Attempt not found' using errcode='42501';end if;
 if a.before_case_id is null then raise exception 'Request the first question first';end if;
 if a.before_graded_at is null then
  select * into q from public.case_questions where id=a.before_case_id;
  v_passed:=lets_unpack_private.grade_core(p_answer,q.aliases,q.required_groups,q.patterns);
  update public.attempts set before_answer=p_answer,before_passed=v_passed,before_graded_at=now() where id=a.id returning * into a;
 end if;
 -- Preserve legacy completion columns for history; the result record exposes only Case 1.
 if a.before_passed and a.graded_at is null then
  update public.attempts set completed_after_first=true,case_question_id=before_case_id,case_answer=before_answer,passed=true,graded_at=before_graded_at where id=a.id returning * into a;
 end if;
 -- Failed baselines remain hidden until Case 2.
 return jsonb_build_object('attempt_id',a.id,'passed',a.before_passed);
end $$;
create or replace function lets_unpack_private.start_attempt(p_id uuid,p_concept_id smallint,p_explanation text,p_sentence text,p_follow_up text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); existing public.attempts; gap public.gaps;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if length(trim(p_explanation)) not between 1 and 5000 or length(p_follow_up) not between 1 and 700 or (p_sentence<>'' and position(p_sentence in p_explanation)=0) then raise exception 'Invalid explanation or follow-up';end if;
 insert into public.learners(id) values(uid) on conflict do nothing;
 insert into public.attempts(id,learner_id,concept_id,explanation) values(p_id,uid,p_concept_id,p_explanation) on conflict(id) do nothing;
 select * into existing from public.attempts where id=p_id for update;
 if existing.completed_after_first then raise exception 'Session already completed';end if;
 if existing.learner_id<>uid then raise exception 'Attempt not found' using errcode='42501';end if;
 if existing.before_case_id is not null and existing.before_graded_at is null then raise exception 'Answer the first question before the follow-up';end if;
 if existing.concept_id<>p_concept_id or existing.explanation<>p_explanation then raise exception 'Attempt input changed';end if;
 insert into public.gaps(attempt_id,sentence,follow_up) values(p_id,p_sentence,p_follow_up) on conflict(attempt_id) do nothing;
 select * into gap from public.gaps where attempt_id=p_id;
 return jsonb_build_object('attempt_id',p_id,'sentence',gap.sentence,'follow_up',gap.follow_up);
end $$;
create or replace function public.lu_submit_first(p_attempt_id uuid,p_answer text) returns jsonb language sql security invoker set search_path='' as $$ select lets_unpack_private.submit_first(p_attempt_id,p_answer) $$;
revoke all on function lets_unpack_private.submit_first(uuid,text),public.lu_submit_first(uuid,text) from public,anon;
grant execute on function lets_unpack_private.submit_first(uuid,text),public.lu_submit_first(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;

begin;
-- Code-based evidence, persisted for each completed attempt; no LLM judgement.
alter table public.attempts add column if not exists gap_closed boolean generated always as (
 case when graded_at is null or before_passed is null then null
 else before_passed=false and passed=true and before_case_id<>case_question_id end
) stored;
create or replace function lets_unpack_private.attempt_record(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select jsonb_build_object('id',a.id,'concept',c.title,'date',a.created_at,'passed',a.passed,'gap_closed',a.gap_closed,'gap_status',case when a.before_passed is null then 'unknown' when a.before_passed then 'not_needed' when a.gap_closed then 'closed' else 'open' end,'completed_after_first',a.completed_after_first,'explanation',a.explanation,'follow_up',case when g.id is null then null else jsonb_build_object('question',g.follow_up,'answer',r.answer,'feedback',g.feedback) end,'before_passed',a.before_passed,'improved',case when a.before_passed is not null then not a.before_passed and a.passed else null end,'results',case when a.before_case_id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('phase','before','case',b.prompt,'answer',a.before_answer,'pass',a.before_passed,'reason',b.answer_reason)) end || case when a.completed_after_first then '[]'::jsonb else jsonb_build_array(jsonb_build_object('phase','after','case',q.prompt,'answer',a.case_answer,'pass',a.passed,'reason',q.answer_reason)) end) into result from public.attempts a join public.concepts c on c.id=a.concept_id join public.case_questions q on q.id=a.case_question_id left join public.case_questions b on b.id=a.before_case_id left join public.gaps g on g.attempt_id=a.id left join public.retries r on r.gap_id=g.id and r.sequence=1 where a.id=p_attempt_id and a.learner_id=uid and a.graded_at is not null;
 if result is null then raise exception 'Completed attempt not found' using errcode='42501';end if;
 return result;
end $$;

notify pgrst,'reload schema';
commit;
