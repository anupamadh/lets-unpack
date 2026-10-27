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
