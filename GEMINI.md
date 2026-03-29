# TickTick CLI — Agent Reference

This project is a TickTick CLI and MCP server. Use it to manage tasks, projects, and notes.

## Quick Reference

### Status & Discovery

```bash
ticktick status --json                    # Get overdue, today, upcoming tasks + project summary
ticktick projects list --json             # List all projects with IDs
ticktick tasks list --json                # List all tasks
```

### Filtering Tasks

```bash
ticktick tasks list --today --json        # Due today
ticktick tasks list --overdue --json      # Past due
ticktick tasks list --week --json         # Due this week
ticktick tasks list --project Work --json # By project name (resolves to ID automatically)
ticktick tasks list --tag urgent --json   # By tag
ticktick tasks list --priority 5 --json   # By priority (0=none, 1=low, 3=medium, 5=high)
```

### Creating Tasks

```bash
ticktick tasks create "Title" --json \
  --project "Work" \
  --due tomorrow \
  --priority 3 \
  --tags "work,urgent" \
  --reminder "0m,5m" \
  --subtasks "step 1,step 2" \
  --repeat "RRULE:FREQ=WEEKLY;BYDAY=MO"
```

Date formats: `today`, `tomorrow`, `next monday`, `+3d`, `+1w`, `2026-04-01`, `2026-04-01T14:30:00+0000`
Reminder shorthand: `0m` (at time), `5m`, `30m`, `1h`, `1d`

### Updating Tasks

```bash
ticktick tasks update <taskId> --project Work --title "New title" --json
ticktick tasks update <taskId> --project Work --add-tag urgent --json
ticktick tasks update <taskId> --project Work --remove-tag urgent --json
ticktick tasks update <taskId> --project Work --due none --json          # Clear field
ticktick tasks update <taskId> --project Work --tags none --json         # Clear all tags
```

### Completing & Deleting

```bash
ticktick tasks complete <projectId> <taskId>
ticktick tasks delete <projectId> <taskId> --force
```

### Projects

```bash
ticktick projects create "Name" --color "#FF0000" --view kanban --json
ticktick projects get <id> --with-tasks --json
ticktick projects update <id> --name "New Name" --json
ticktick projects delete <id> --force
```

### Notes (NOTE-kind projects)

```bash
ticktick notes list --json
ticktick notes create "Title" --project Coach --content "Body text" --json
```

## Project Name Resolution

All `--project` flags accept names instead of IDs. Matching is case-insensitive, emoji-stripped, and supports partial matches:
- `--project Work` matches `💼Work`
- `--project groceries` matches `🥕Groceries & Meals`

## MCP Server

If configured as an MCP server, use the `ticktick_*` tools directly instead of the CLI. Key tools:
- `ticktick_status` — best starting point, returns full dashboard
- `ticktick_resolve_project` — resolve name to ID
- `ticktick_list_tasks` — with optional `projectId` filter
- `ticktick_create_task` — pass `tags`, `reminders`, `repeatFlag`, `dueDate`, `priority`

## Build

```bash
npm run build    # Compile TypeScript
npm link         # Make `ticktick` available globally
```
