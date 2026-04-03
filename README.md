# ticktick-cli

[![CI](https://github.com/ashark-ai-05/ticktick-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/ashark-ai-05/ticktick-cli/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ashark-ai-05/ticktick-cli/actions/workflows/codeql.yml/badge.svg)](https://github.com/ashark-ai-05/ticktick-cli/actions/workflows/codeql.yml)
[![Security Audit](https://github.com/ashark-ai-05/ticktick-cli/actions/workflows/security-audit.yml/badge.svg)](https://github.com/ashark-ai-05/ticktick-cli/actions/workflows/security-audit.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/badge/version-0.1.0-orange)](https://github.com/ashark-ai-05/ticktick-cli)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A TypeScript CLI and MCP server for the [TickTick Open API](https://developer.ticktick.com/docs#/openapi). Manage tasks, projects, and notes from the terminal or through AI agents.

## Features

- Full coverage of TickTick Open API (14 MCP tools, 20+ CLI commands)
- Human-friendly output (tables, colors) and `--json` mode for agents
- MCP server for direct AI agent integration
- OAuth 2.0 authentication with automatic token refresh
- Project name resolution (use names instead of IDs)
- Task filters: `--today`, `--overdue`, `--week`, `--tag`, `--priority`
- Tags, reminders, subtasks, recurring tasks, start/due dates

## Setup

### 1. Register a TickTick App

Go to [developer.ticktick.com](https://developer.ticktick.com) > Manage Apps > Register.

Set redirect URI to `http://localhost:8090/callback`.

### 2. Configure

Create `~/.ticktick/config.json`:

```json
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "http://localhost:8090/callback"
}
```

### 3. Install

```bash
git clone https://github.com/ashark-ai-05/ticktick-cli.git
cd ticktick-cli
npm install
npm run build
npm link
```

### 4. Login

```bash
ticktick login
```

## CLI Usage

```bash
# Dashboard
ticktick status                          # Overdue, today, upcoming, project summary

# Projects
ticktick projects list                   # List all projects
ticktick projects get <id> --with-tasks  # Project with all tasks
ticktick projects create "My Project" --color "#FF0000" --view kanban

# Tasks
ticktick tasks list                      # All tasks
ticktick tasks list --today              # Due today
ticktick tasks list --overdue            # Past due
ticktick tasks list --week               # Due this week
ticktick tasks list --project Work       # By project name (no ID needed)
ticktick tasks list --tag urgent         # By tag
ticktick tasks list --priority 5         # By priority

ticktick tasks create "Buy milk" --project Groceries --due tomorrow --priority 1 --tags "home,errands"
ticktick tasks create "Standup" --due "2026-04-01T09:00:00+0000" --reminder "0m,5m" --repeat "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
ticktick tasks create "Deploy v2" --subtasks "run tests,update docs,merge PR"

ticktick tasks update <taskId> --project Work --add-tag urgent
ticktick tasks update <taskId> --project Work --remove-tag urgent
ticktick tasks update <taskId> --project Work --due none          # Clear due date
ticktick tasks complete <projectId> <taskId>
ticktick tasks delete <projectId> <taskId> --force

# Notes (items in NOTE-kind projects)
ticktick notes list
ticktick notes create "Meeting notes" --project Coach --content "Key takeaways..."

# JSON output (for agents/scripts)
ticktick tasks list --json
ticktick status --json
```

## MCP Server

Connect to Claude Code:

```bash
claude mcp add ticktick -- node /path/to/ticktick-cli/dist/mcp.js
```

### Available Tools (14)

| Tool | Description |
|------|-------------|
| `ticktick_status` | Dashboard: overdue, today, upcoming, project counts |
| `ticktick_resolve_project` | Resolve project name to ID |
| `ticktick_list_projects` | List all projects |
| `ticktick_get_project` | Get project by ID |
| `ticktick_get_project_data` | Get project with tasks and columns |
| `ticktick_create_project` | Create project |
| `ticktick_update_project` | Update project |
| `ticktick_delete_project` | Delete project |
| `ticktick_list_tasks` | List tasks (optional project filter) |
| `ticktick_get_task` | Get task by project + task ID |
| `ticktick_create_task` | Create task with title, tags, reminders, etc. |
| `ticktick_update_task` | Update task fields |
| `ticktick_complete_task` | Mark task complete |
| `ticktick_delete_task` | Delete task |

## Architecture

```
src/
  types.ts          # All interfaces and error classes
  config.ts         # Paths, URLs, constants
  auth.ts           # OAuth flow, token storage, refresh
  client.ts         # TickTickClient (shared by CLI + MCP)
  date-parser.ts    # Human-friendly date parsing
  formatters.ts     # Pretty + JSON output
  cli.ts            # CLI entry point (Commander.js)
  mcp.ts            # MCP server entry point
  commands/
    login.ts        # login/logout
    projects.ts     # project subcommands
    tasks.ts        # task subcommands
    notes.ts        # note subcommands
```

## License

MIT
