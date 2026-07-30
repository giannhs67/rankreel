-- RankReel — projects need to know their own composition format up front (M8: Title Banner +
-- Caption formats join Ranking List). Previously this was only implicit in whichever template
-- got lazily created for a project, which only ever happened to be 'ranking_list'.
alter table projects
  add column if not exists format text not null default 'ranking_list'
    check (format in ('ranking_list', 'title_banner', 'caption'));
