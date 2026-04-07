# 📋 Kanban Board System - Complete Guide

A Jira/Trello-style project management system integrated into EduCare Bots.

## 📚 Documentation Files

| File | Purpose | For |
|------|---------|-----|
| **`KANBAN_FRONTEND_GUIDE.md`** | 🚀 Quick integration guide with copy-paste components | **Frontend developers** |
| **`KANBAN_API_DOCS.md`** | 📖 Complete API reference with all endpoints | API reference lookup |
| **`KANBAN_README.md`** | 📋 Backend overview (this file) | Backend developers |
| **`SENDGRID_SETUP.md`** | 📧 Email notification setup | DevOps/Setup |

**👉 Start here:** `KANBAN_FRONTEND_GUIDE.md`

---

## 🚀 Features

### Workspaces
- ✅ Create unlimited workspaces (projects/boards)
- ✅ Invite team members by email
- ✅ Auto-generated default columns (To Do, In Progress, Review, Done)
- ✅ Create custom columns with colors
- ✅ Owner/member permissions

### Tasks
- ✅ Create tasks with title, description, priority, due date
- ✅ Assign tasks to team members
- ✅ Drag & drop between columns (via API)
- ✅ Priority levels: low, medium, high, urgent
- ✅ Track task position within columns

### Collaboration
- ✅ Comment threads on tasks
- ✅ File attachments on tasks
- ✅ Activity timeline (who did what, when)
- ✅ Email notifications (invites, assignments, comments)

### Analytics
- ✅ Task distribution by column (Kanban view)
- ✅ Task distribution by priority (pie chart)
- ✅ Task distribution by assignee (bar chart)
- ✅ Overdue tasks tracking
- ✅ Completion rate metrics
- ✅ Tasks over time (trend chart)
- ✅ Member activity stats
- ✅ Personal dashboard
- ✅ Global system analytics

---

## 📊 Database Schema

### Tables Created
1. **workspaces** - Project spaces
2. **workspace_members** - Access control
3. **workspace_invitations** - Email invitations
4. **board_columns** - Kanban columns
5. **tasks** - Task cards
6. **task_comments** - Comment threads
7. **task_attachments** - File uploads
8. **activity_log** - Audit trail

### Relationships
- Workspaces have many members (users)
- Workspaces have many columns
- Columns have many tasks
- Tasks have many comments and attachments
- All activity logged for timeline view

---

## 🔧 Setup

### 1. Database Migration
The database will auto-migrate on first run when you start the server:

```bash
python -m uvicorn api:app --reload
```

The `init_db()` function will create all Kanban tables automatically.

### 2. Email Configuration (Optional)

Add to your `.env` file:

```bash
# Email Notifications (for Kanban invites and task assignments)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=EduCare Bots

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

**Gmail App Password Setup:**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use that password in `EMAIL_PASSWORD`

### 3. Test the System

Run the test script:

```bash
python test_kanban.py
```

This will:
- Create 3 test users
- Create a workspace
- Invite members
- Create tasks
- Add comments
- Show activity log

---

## 📡 API Endpoints

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces` | List my workspaces |
| GET | `/workspaces/{id}` | Get workspace (members, columns, tasks) |
| PUT | `/workspaces/{id}` | Update workspace |
| DELETE | `/workspaces/{id}` | Delete workspace |

### Members & Invitations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workspaces/{id}/members` | List members |
| POST | `/workspaces/{id}/invite` | Invite by email |
| GET | `/invitations/accept?token=xxx` | Accept invitation |
| GET | `/invitations/pending` | My pending invitations |
| DELETE | `/workspaces/{id}/members/{uid}` | Remove member |

### Columns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workspaces/{id}/columns` | List columns |
| POST | `/workspaces/{id}/columns` | Create custom column |
| PUT | `/columns/{id}` | Update column |
| DELETE | `/columns/{id}` | Delete column |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workspaces/{id}/tasks` | List all tasks |
| POST | `/workspaces/{id}/tasks` | Create task |
| GET | `/tasks/{id}` | Get task details |
| PATCH | `/tasks/{id}` | Update task (move, edit, assign) |
| DELETE | `/tasks/{id}` | Delete task |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks/{id}/comments` | List comments |
| POST | `/tasks/{id}/comments` | Add comment |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks/{id}/attachments` | List attachments |
| POST | `/tasks/{id}/attachments` | Upload file |

### Activity & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workspaces/{id}/activity` | Activity log |
| GET | `/workspaces/{id}/analytics` | Workspace analytics |
| GET | `/analytics/me` | My personal analytics |
| GET | `/analytics/global` | System-wide analytics |
| GET | `/dashboard/summary` | Quick dashboard summary |

---

## 🎯 Usage Examples

### 1. Create Workspace

```bash
curl -X POST http://localhost:8000/workspaces \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Math Department - Q2 2024",
    "description": "Curriculum planning"
  }'
```

Response:
```json
{
  "workspace": {
    "id": 1,
    "name": "Math Department - Q2 2024",
    "description": "Curriculum planning",
    "owner_id": 1,
    "created_at": "2024-04-07T10:00:00Z"
  }
}
```

### 2. Invite Team Member

```bash
curl -X POST http://localhost:8000/workspaces/1/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@school.edu"}'
```

### 3. Create Task

```bash
curl -X POST http://localhost:8000/workspaces/1/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "column_id": 1,
    "title": "Review Q1 Curriculum",
    "description": "Analyze student performance",
    "assignee_email": "teacher@school.edu",
    "priority": "high",
    "due_date": "2024-05-15T17:00:00Z"
  }'
```

### 4. Move Task (Drag & Drop)

```bash
curl -X PATCH http://localhost:8000/tasks/5 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "column_id": 2,
    "position": 0
  }'
```

### 5. Add Comment

```bash
curl -X POST http://localhost:8000/tasks/5/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Started working on this!"}'
```

### 6. Get Analytics

```bash
curl http://localhost:8000/workspaces/1/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response includes:
```json
{
  "tasks_by_column": [
    {"column_name": "To Do", "color": "#6B7280", "task_count": 5},
    {"column_name": "In Progress", "color": "#3B82F6", "task_count": 3},
    {"column_name": "Done", "color": "#10B981", "task_count": 12}
  ],
  "tasks_by_priority": [
    {"priority": "urgent", "count": 2},
    {"priority": "high", "count": 5},
    {"priority": "medium", "count": 8}
  ],
  "completion_rate": 60.0,
  "total_tasks": 20,
  "overdue_tasks": [...]
}
```

---

## 📧 Email Notifications

When configured, automatic emails are sent for:

### 1. Workspace Invitation
- **Trigger:** User invited to workspace
- **Recipient:** Invited user
- **Content:** Invitation link (signup if new, direct access if existing)

### 2. Task Assignment
- **Trigger:** Task assigned to user
- **Recipient:** Assignee
- **Content:** Task details, priority, due date, link to task

### 3. Task Comment (Optional - implement if needed)
- **Trigger:** Comment added to task
- **Recipient:** Task assignee & reporter
- **Content:** Comment preview, link to task

### 4. Due Date Reminder (Optional - implement via cron)
- **Trigger:** Task due in 24 hours
- **Recipient:** Assignee
- **Content:** Reminder with task details

---

## 🎨 Frontend Integration

### React/Vue/Angular Components Needed

1. **Workspace List** (`/workspaces`)
   - Grid/list of workspaces
   - Create new workspace button

2. **Kanban Board** (`/workspaces/{id}`)
   - Columns with drag & drop (react-beautiful-dnd)
   - Task cards with priority badges
   - Add task modal

3. **Task Detail Modal** (`/tasks/{id}`)
   - Full task info
   - Comment thread
   - File attachments
   - Edit fields

4. **Analytics Dashboard** (`/analytics`)
   - Charts: Recharts, Chart.js, or Victory
   - Pie chart: tasks by priority
   - Bar chart: tasks by user
   - Line chart: tasks over time

5. **User Dashboard** (`/dashboard`)
   - Quick stats cards
   - Upcoming tasks list
   - Overdue alerts

### Example: React Kanban Board

```jsx
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function KanbanBoard({ workspaceId }) {
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);

  const onDragEnd = (result) => {
    // Update task column via PATCH /tasks/{id}
    fetch(`/tasks/${result.draggableId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        column_id: result.destination.droppableId,
        position: result.destination.index
      })
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {columns.map(column => (
        <Droppable key={column.id} droppableId={column.id}>
          {/* Render tasks */}
        </Droppable>
      ))}
    </DragDropContext>
  );
}
```

---

## 🔒 Permissions

| Action | Owner | Member | Non-Member |
|--------|-------|--------|------------|
| View workspace | ✅ | ✅ | ❌ |
| Create tasks | ✅ | ✅ | ❌ |
| Edit tasks | ✅ | ✅ | ❌ |
| Assign tasks | ✅ | ✅ | ❌ |
| Add comments | ✅ | ✅ | ❌ |
| Upload files | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |

---

## 🚦 Next Steps

### Phase 1 (Current) ✅
- [x] Database schema
- [x] CRUD operations
- [x] API endpoints
- [x] Email notifications
- [x] Analytics

### Phase 2 (Optional)
- [ ] Task dependencies (blocker tasks)
- [ ] Subtasks
- [ ] Labels/tags
- [ ] Time tracking
- [ ] Recurring tasks
- [ ] Task templates
- [ ] Sprint planning
- [ ] Gantt chart view
- [ ] Calendar view
- [ ] Mobile app

### Phase 3 (Optional)
- [ ] Real-time updates (WebSockets)
- [ ] @mentions in comments
- [ ] Slack/Teams integration
- [ ] GitHub integration
- [ ] CSV export
- [ ] Custom fields

---

## 🐛 Troubleshooting

### Issue: Emails not sending
**Solution:** Check `.env` configuration:
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  # Not your regular password!
```

### Issue: Can't invite users
**Solution:** Ensure user is a workspace member:
```python
is_workspace_member(workspace_id, user_id)
```

### Issue: Tasks not showing
**Solution:** Check column_id is valid:
```bash
GET /workspaces/{id}/columns
```

---

## 📞 Support

For issues or questions:
- Check API docs: http://localhost:8000/docs
- Run test script: `python test_kanban.py`
- View logs in terminal

---

**Built with FastAPI + SQLite + Claude Agent SDK** 🚀
