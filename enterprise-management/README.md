# Structure - Enterprise Management Tool

A per-user task management dashboard with focus items, work logging, and a Trello-style task board.

## Quick Start

```bash
cd enterprise-management
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register a new account.

## Setup Details

### 1. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically (via the `postinstall` script) to create the database client.

### 2. Create the database

```bash
npm run db:push
```

This creates a local SQLite file (`dev.db`) in the project root with all the required tables. Alternatively, use `npm run db:migrate` to create the database via Prisma migrations.

### 3. Start the dev server

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### 4. Create an account

Go to `/register`, enter an email and password (min 6 characters). On registration, five default team members are created for you: Thomas, Kathleen, David, Marcelo, and Roman.

## How to Use

### Authentication

- **Register** at `/register` with any email/password.
- **Login** at `/login` with your credentials.
- **Sign out** via the button in the top-right navbar.
- Each account has its own isolated data. Nothing is shared between accounts.

### Dashboard (`/dashboard`)

The dashboard has three cards:

#### Focus Items (top-left)

A quick bullet list for priorities or notes.

- Click **+ Add** to create a new item.
- Click any item text to edit it inline. Press **Enter** to save, **Escape** to cancel.
- **Drag** items by the grip dots to reorder.
- Hover over an item and click **X** to delete it.
- Items auto-flow into 2 columns.

#### Work Log (top-right)

Log time against tasks and track completion.

1. **Start/Stop timer** - Click "Start" to begin timing. Click "Stop" to pause. The elapsed time is shown in minutes:seconds.
2. **Manual minutes** - Alternatively, type minutes directly in the "min override" field. This takes priority over the timer.
3. **Select a task** - Click the task dropdown to search existing tasks. Select one to log time against.
4. **Create a new task** - If you type a name that doesn't match any existing task, a "Create '...'" option appears. Clicking it opens a modal where you set:
   - Title (pre-filled)
   - Assignee (required - pick from your team members)
   - Row status (Current / Next Sprint / Backlog)
   - Completion % (required)
   - Due date (optional)
5. **Set completion %** - This represents the overall task completion after this work session (0-100).
6. **Write a description** - Describe what you worked on (required).
7. **Save** - Creates a commit record, updates the task's completion percentage.

All fields are validated: task, completion %, description, and time are required.

#### Task Manager (bottom, full width)

A board with 3 rows and person columns.

- **Rows**: Current, Next Sprint, Backlog
- **Columns**: One per team member
- **Task cards** show: title, completion %, progress bar, total time, due date.
- **Drag and drop** any task card to move it between rows and/or reassign it to a different person.
- **Click** a task card to open the expanded view (see below).

**Manage People** (button in header):
- **Add** a person by typing their name and clicking "Add".
- **Remove** a person by clicking the X on their tag. If they have tasks, you must pick a replacement person to reassign those tasks to.

#### Task Expanded View (modal)

Click any task card to open its detail modal:

- **Title** - Click to edit inline.
- **Completion %** - Edit and tab/click away to save.
- **Due date** - Pick a date to set/change the deadline.
- **Total time** - Automatically computed from all commits.
- **Commits** - Listed newest-first. Each shows timestamp, description, and time spent.
  - Hover to reveal **Edit** and **Delete** buttons.
  - Edit lets you change description, minutes, and timestamp.
  - Delete asks for confirmation.
- **Delete Task** - Bottom-right button. Requires confirmation. Deletes the task and all its commits.

### System (`/system`)

Placeholder page. Shows "Coming soon".

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema to database (no migration files) |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

## Database

Data is stored in a local SQLite file (`dev.db` in the project root). To reset all data, delete this file and run `npm run db:push` again.

To browse data visually:

```bash
npm run db:studio
```

This opens Prisma Studio at `http://localhost:5555` where you can view and edit all tables.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Prisma ORM 7 + SQLite (via better-sqlite3 adapter)
- **Auth**: NextAuth.js v5 (Credentials provider, bcryptjs for password hashing)
- **Drag & Drop**: dnd-kit
