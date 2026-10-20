# RankReel — Top 6 Studio (development branch)

This branch is for the user's six-clip vertical ranking workflow, accessible from Windows and iPhone.

## Product requirements
- Six ranking slots, numbered #6 to #1, in playback order.
- Upload only footage the user owns or has permission to reuse.
- Allow titles, trimming, ordering, 9:16 preview, and local MP4 export.
- Require explicit review before publishing; do not auto-publish.
- Mobile-friendly project review and approval, while Windows handles GPU-intensive rendering.
- Optional English narration, subtitles, and music with locally installed tools; these are future integrations, not implemented by this document.
- Keep service credentials on the server, never expose service-role keys to the browser.
- No paid cloud GPU dependency required for the local workflow.

## Existing implementation
The current Remotion RankingList composition already renders an arbitrary number of clips. Top 6 should use six uploaded clips, not a hard-coded Top 5 composition.

## Acceptance checklist
- [ ] Create a Ranking List project.
- [ ] Add six permitted clips with numbers 6, 5, 4, 3, 2, 1.
- [ ] Verify mobile layout and clip ordering.
- [ ] Preview all six clips.
- [ ] Render a 1080x1920 MP4 on Windows.
- [ ] Verify Supabase configuration without leaking secrets.
- [ ] Add narration and captions only after base render passes.
- [ ] Configure secure remote iPhone access separately.

## Important
GitHub stores source code, not the user's local secrets or running Windows process. Local .env.local setup and end-to-end rendering still require testing on the user's PC.
