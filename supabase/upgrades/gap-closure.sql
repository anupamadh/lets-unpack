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
