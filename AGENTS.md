<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Curriculum, terminal simulation and progress logic live as pure data/functions in src/lib (curriculum.ts, terminal.ts, progress.ts); UI only reads them — keeps content expandable and logic testable.
- Progress is local-first (localStorage via useSyncExternalStore in progress.ts); rewards are keyed so each XP reward can be claimed once — prevents XP farming.
