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
