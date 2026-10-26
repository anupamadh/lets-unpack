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
