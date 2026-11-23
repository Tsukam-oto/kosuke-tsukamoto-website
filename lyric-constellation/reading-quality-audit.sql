-- 歌詞の星座｜精読・星座・言葉の地層：非破壊の品質監査
-- 2026-11-06 / private Supabase SQL editor or authorized read-only integration
-- SELECT only. No INSERT / UPDATE / DELETE / DDL. Never output private lyrics,
-- titles, exact phrases, user IDs or records to public CI logs / GitHub.
-- Original-source string match does NOT prove the PDF extraction is correct
-- or that an AI interpretation is sound. These are separate editorial gates.

-- 1. Every quote, using its *correct* backing corpus:
--    - individual close readings: work or strata entry
--    - constellation anchors: work or note
--    - cross-reading: either work or strata entry, both sides
with source_anchors as (
  select 'individual' as area,a.value->>'quote' as quote,
         coalesce(v.literal_text,e.original_text) as source_text
  from public.lyric_work_close_readings_v2 r
  cross join lateral jsonb_array_elements(r.anchors) a
  left join public.lyric_master_text_versions v
    on v.work_id=r.work_id and v.version_no=r.source_version_no
  left join public.lyric_strata_entries e on e.id=r.entry_id

  union all
  select 'constellation',a.value->>'quote',
         coalesce(v.literal_text,e.original_text)
  from public.lyric_close_reading_paths p
  cross join lateral jsonb_array_elements(p.anchors) a
  left join public.lyric_master_text_versions v
    on a.value->>'kind'='work'
       and v.work_id::text=a.value->>'source_id'
       and v.version_no=(a.value->>'source_version')::integer
  left join public.lyric_strata_entries e
    on a.value->>'kind'='note' and e.id::text=a.value->>'source_id'

  union all
  select 'cross_reading',c.evidence_left,
         coalesce(v.literal_text,e.original_text)
  from public.lyric_cross_readings c
  left join public.lyric_master_text_versions v
    on v.work_id=c.left_work_id and v.version_no=c.left_source_version
  left join public.lyric_strata_entries e on e.id=c.left_entry_id

  union all
  select 'cross_reading',c.evidence_right,
         coalesce(v.literal_text,e.original_text)
  from public.lyric_cross_readings c
  left join public.lyric_master_text_versions v
    on v.work_id=c.right_work_id and v.version_no=c.right_source_version
  left join public.lyric_strata_entries e on e.id=c.right_entry_id
)
select area,count(*) as references,
  count(*) filter (where source_text is not null and quote is not null
    and btrim(quote)<>'' and position(quote in source_text)>0) as exact_match,
  count(*) filter (where source_text is null or quote is null or btrim(quote)='') as unresolved,
  count(*) filter (where source_text is not null and quote is not null
    and btrim(quote)<>'' and position(quote in source_text)=0) as mismatch
from source_anchors group by area order by area;

-- 2. Editorial work queue: repeated observations are only a *candidate* for
-- shallow analysis. Short text alone cannot determine quality. A fragment is
-- NOT a failed complete song; audit it under a different reading standard.
with common_observation as (
  select observation
  from public.lyric_cross_readings
  group by observation
  having count(*)>=3
)
select case when c.left_entry_id is not null or c.right_entry_id is not null
            then 'strata_related' else 'finished_work_pair' end as evidence_type,
  count(*) as comparisons,
  count(*) filter (where c.observation in (select observation from common_observation)) as repeated_observation,
  count(*) filter (where length(coalesce(c.interpretation,''))<75) as short_interpretation,
  count(*) filter (where length(coalesce(c.alternative,''))<35) as short_alternative,
  count(*) filter (where c.observation in (select observation from common_observation)
                   and length(coalesce(c.interpretation,''))<75) as repeated_and_short
from public.lyric_cross_readings c
group by evidence_type order by evidence_type;

-- 3. Version validity: a quote can match an older version yet still be stale.
with latest as (
  select work_id,max(version_no) as version_no
  from public.lyric_master_text_versions
  group by work_id
), references as (
  select 'individual' as area,r.work_id,r.source_version_no as cited_version
  from public.lyric_work_close_readings_v2 r where r.work_id is not null
  union all
  select 'cross_reading',left_work_id,left_source_version
  from public.lyric_cross_readings where left_work_id is not null
  union all
  select 'cross_reading',right_work_id,right_source_version
  from public.lyric_cross_readings where right_work_id is not null
)
select area,count(*) as referenced_work_sides,
  count(*) filter (where cited_version<l.version_no) as stale_version,
  count(*) filter (where cited_version is null) as missing_version
from references r join latest l on l.work_id=r.work_id
group by area order by area;

-- 4. Human-readable facts, not grades: count provisional data and unverified
-- PDF transcriptions. The original archival extraction still needs independent
-- source verification before any external publication.
select text_status,count(*) as stored_versions
from public.lyric_master_text_versions
group by text_status order by stored_versions desc;
