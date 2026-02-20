## Architecture Context

This project uses the [design plugin](https://github.com/joestump/claude-plugin-design) for architecture governance.

- Architecture Decision Records are in `docs/adrs/`
- Specifications are in `docs/openspec/specs/`

### Design Plugin Skills

| Skill | Purpose |
|-------|---------|
| `/design:adr` | Create a new Architecture Decision Record |
| `/design:spec` | Create a new specification |
| `/design:list` | List all ADRs and specs with status |
| `/design:status` | Update the status of an ADR or spec |
| `/design:docs` | Generate a documentation site |
| `/design:init` | Set up CLAUDE.md with architecture context |
| `/design:prime` | Load architecture context into session |
| `/design:check` | Quick-check code against ADRs and specs for drift |
| `/design:audit` | Comprehensive design artifact alignment audit |
| `/design:discover` | Discover implicit architecture from existing code |
| `/design:plan` | Break a spec into trackable issues for sprint planning |

Run `/design:prime [topic]` at the start of a session to load relevant ADRs and specs into context.

### Release Process

When releasing a new version:
1. Bump the version in `.claude-plugin/plugin.json`
2. Commit and push to `main`
3. Create a GitHub release with `gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."` using a haiku as the release summary
4. Always tag releases as `vX.Y.Z` (e.g., `v1.5.0`)
