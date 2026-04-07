# 🚀 Kanban API - Quick Integration Guide

Integrate Kanban board into your EduCare Bots frontend in 30 minutes.

---

## ⚡ Quick Start

### 1. Setup API Helper

```javascript
// utils/api.js
const API_BASE = 'http://localhost:8000';

export async function kanbanAPI(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'API Error');
  }
  
  return await response.json();
}
```

### 2. Use Existing Auth

**Your current login already provides the JWT token!** Just use it:

```javascript
// After your existing login
const token = response.access_token;
localStorage.setItem('access_token', token);

// Now you can call Kanban endpoints
```

---

## 📊 All Endpoints (Quick Reference)

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/workspaces` | Create workspace |
| `GET` | `/workspaces` | List my workspaces |
| `GET` | `/workspaces/{id}` | Get full board (columns + tasks) |
| `PUT` | `/workspaces/{id}` | Update workspace |
| `DELETE` | `/workspaces/{id}` | Delete workspace |

### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/workspaces/{id}/invite` | Invite user by email |
| `GET` | `/workspaces/{id}/members` | List members |
| `DELETE` | `/workspaces/{id}/members/{uid}` | Remove member |
| `GET` | `/invitations/pending` | My pending invitations |
| `GET` | `/invitations/accept?token=xxx` | Accept invitation |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/workspaces/{id}/tasks` | Create task |
| `GET` | `/workspaces/{id}/tasks` | List all tasks |
| `GET` | `/tasks/{id}` | Get task details + comments |
| `PATCH` | `/tasks/{id}` | Update task (move, edit) |
| `DELETE` | `/tasks/{id}` | Delete task |

### Comments & Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tasks/{id}/comments` | Add comment |
| `GET` | `/tasks/{id}/comments` | List comments |
| `POST` | `/tasks/{id}/attachments` | Upload file |
| `GET` | `/tasks/{id}/attachments` | List files |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workspaces/{id}/analytics` | Workspace stats |
| `GET` | `/analytics/me` | My personal stats |
| `GET` | `/dashboard/summary` | Quick dashboard |

---

## 💻 Copy-Paste Components

### 1. Workspace List

```javascript
// pages/WorkspaceList.jsx
import { useEffect, useState } from 'react';
import { kanbanAPI } from '../utils/api';

export default function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kanbanAPI('/workspaces')
      .then(data => setWorkspaces(data.workspaces))
      .finally(() => setLoading(false));
  }, []);

  const createWorkspace = async (name) => {
    const data = await kanbanAPI('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description: '' })
    });
    setWorkspaces([...workspaces, data.workspace]);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="workspace-list">
      <h1>My Workspaces</h1>
      <button onClick={() => {
        const name = prompt('Workspace name:');
        if (name) createWorkspace(name);
      }}>
        + New Workspace
      </button>

      <div className="grid">
        {workspaces.map(ws => (
          <div key={ws.id} className="workspace-card">
            <h3>{ws.name}</h3>
            <p>{ws.description}</p>
            <a href={`/workspaces/${ws.id}`}>Open →</a>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 2. Kanban Board

```javascript
// pages/KanbanBoard.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { kanbanAPI } from '../utils/api';

export default function KanbanBoard() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);

  useEffect(() => {
    loadBoard();
  }, [id]);

  const loadBoard = async () => {
    const data = await kanbanAPI(`/workspaces/${id}`);
    setBoard(data);
  };

  const createTask = async (columnId) => {
    const title = prompt('Task title:');
    if (!title) return;

    await kanbanAPI(`/workspaces/${id}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        column_id: columnId,
        title,
        description: '',
        priority: 'medium'
      })
    });

    loadBoard(); // Refresh
  };

  const moveTask = async (taskId, newColumnId) => {
    await kanbanAPI(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ column_id: newColumnId })
    });

    loadBoard(); // Refresh
  };

  if (!board) return <div>Loading...</div>;

  return (
    <div className="kanban-board">
      <h1>{board.workspace.name}</h1>

      <div className="columns">
        {board.columns.map(column => (
          <div key={column.id} className="column">
            <h2 style={{ borderColor: column.color }}>
              {column.name}
              <button onClick={() => createTask(column.id)}>+</button>
            </h2>

            {board.tasks
              .filter(t => t.column_id === column.id)
              .map(task => (
                <div key={task.id} className="task-card">
                  <h4>{task.title}</h4>
                  <span className={`priority ${task.priority}`}>
                    {task.priority}
                  </span>
                  {task.assignee_name && (
                    <small>👤 {task.assignee_name}</small>
                  )}
                  
                  {/* Move buttons */}
                  <div className="task-actions">
                    {board.columns.map(col => 
                      col.id !== column.id && (
                        <button 
                          key={col.id}
                          onClick={() => moveTask(task.id, col.id)}
                        >
                          → {col.name}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**CSS:**
```css
.kanban-board {
  padding: 20px;
}

.columns {
  display: flex;
  gap: 20px;
  overflow-x: auto;
}

.column {
  min-width: 300px;
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
}

.task-card {
  background: white;
  padding: 12px;
  margin: 10px 0;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.priority.high { color: #ef4444; font-weight: bold; }
.priority.urgent { color: #dc2626; font-weight: bold; }
```

---

### 3. Task Detail Modal

```javascript
// components/TaskDetail.jsx
import { useEffect, useState } from 'react';
import { kanbanAPI } from '../utils/api';

export default function TaskDetail({ taskId, onClose }) {
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    kanbanAPI(`/tasks/${taskId}`)
      .then(data => setTask(data));
  }, [taskId]);

  const addComment = async () => {
    await kanbanAPI(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
    
    setComment('');
    // Refresh task
    kanbanAPI(`/tasks/${taskId}`).then(data => setTask(data));
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    await fetch(`http://localhost:8000/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: formData
    });

    // Refresh task
    kanbanAPI(`/tasks/${taskId}`).then(data => setTask(data));
  };

  if (!task) return <div>Loading...</div>;

  return (
    <div className="modal">
      <div className="modal-content">
        <button onClick={onClose}>✕</button>

        <h2>{task.task.title}</h2>
        <p>{task.task.description}</p>

        <div className="task-meta">
          <span>Priority: {task.task.priority}</span>
          <span>Due: {task.task.due_date}</span>
        </div>

        {/* Comments */}
        <h3>Comments</h3>
        {task.comments.map(c => (
          <div key={c.id} className="comment">
            <strong>{c.username}:</strong> {c.comment}
            <small>{new Date(c.created_at).toLocaleString()}</small>
          </div>
        ))}

        <textarea 
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Add a comment..."
        />
        <button onClick={addComment}>Post Comment</button>

        {/* Attachments */}
        <h3>Attachments</h3>
        {task.attachments.map(a => (
          <div key={a.id}>
            <a href={`http://localhost:8000${a.file_url}`} target="_blank">
              📎 {a.file_name}
            </a>
          </div>
        ))}

        <input 
          type="file" 
          onChange={e => uploadFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}
```

---

### 4. Dashboard

```javascript
// pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { kanbanAPI } from '../utils/api';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    kanbanAPI('/dashboard/summary')
      .then(data => setSummary(data));
  }, []);

  if (!summary) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>My Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Workspaces</h3>
          <div className="big-number">{summary.workspaces_count}</div>
        </div>

        <div className="stat-card">
          <h3>Active Tasks</h3>
          <div className="big-number">{summary.active_tasks}</div>
        </div>

        <div className="stat-card alert">
          <h3>Overdue</h3>
          <div className="big-number">{summary.overdue_tasks}</div>
        </div>

        <div className="stat-card success">
          <h3>Done This Week</h3>
          <div className="big-number">{summary.completed_this_week}</div>
        </div>
      </div>

      <h2>Upcoming Tasks</h2>
      {summary.upcoming_tasks.map(task => (
        <div key={task.id} className="task-preview">
          <h4>{task.title}</h4>
          <span className={`priority ${task.priority}`}>{task.priority}</span>
          <small>Due: {new Date(task.due_date).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  );
}
```

---

### 5. Invite Members

```javascript
// components/InviteModal.jsx
import { useState } from 'react';
import { kanbanAPI } from '../utils/api';

export default function InviteModal({ workspaceId, onClose }) {
  const [email, setEmail] = useState('');

  const inviteUser = async () => {
    try {
      const data = await kanbanAPI(`/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      if (data.user_exists) {
        alert(`✅ ${email} added to workspace!`);
      } else {
        alert(`✅ Invitation sent to ${email}`);
      }

      onClose();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Invite Team Member</h2>
        <input 
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="user@school.edu"
        />
        <button onClick={inviteUser}>Send Invitation</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
```

---

## 🎨 Analytics Integration

### Workspace Analytics with Charts

```javascript
// pages/Analytics.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { kanbanAPI } from '../utils/api';

export default function Analytics() {
  const { id } = useParams();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    kanbanAPI(`/workspaces/${id}/analytics`)
      .then(data => setAnalytics(data));
  }, [id]);

  if (!analytics) return <div>Loading...</div>;

  const COLORS = ['#6B7280', '#3B82F6', '#F59E0B', '#10B981'];

  return (
    <div className="analytics">
      <h1>Workspace Analytics</h1>

      {/* Completion Rate */}
      <div className="stat-hero">
        <h2>Completion Rate</h2>
        <div className="progress-circle">{analytics.completion_rate}%</div>
        <p>{analytics.completed_tasks} of {analytics.total_tasks} tasks done</p>
      </div>

      {/* Tasks by Priority - Pie Chart */}
      <div className="chart-section">
        <h3>Tasks by Priority</h3>
        <PieChart width={400} height={400}>
          <Pie
            data={analytics.tasks_by_priority}
            dataKey="count"
            nameKey="priority"
            cx="50%"
            cy="50%"
            outerRadius={150}
            label
          >
            {analytics.tasks_by_priority.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </div>

      {/* Tasks by User - Bar Chart */}
      <div className="chart-section">
        <h3>Tasks by Team Member</h3>
        <BarChart width={600} height={300} data={analytics.tasks_by_assignee}>
          <XAxis dataKey="username" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="task_count" fill="#3B82F6" />
        </BarChart>
      </div>

      {/* Overdue Tasks Alert */}
      {analytics.overdue_tasks.length > 0 && (
        <div className="alert-box">
          <h3>⚠️ {analytics.overdue_tasks.length} Overdue Tasks</h3>
          {analytics.overdue_tasks.map(task => (
            <div key={task.id} className="overdue-item">
              <strong>{task.title}</strong>
              <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Install Recharts:**
```bash
npm install recharts
```

---

## 🚦 Common Integration Patterns

### Pattern 1: Real-time Updates (Polling)

```javascript
// Auto-refresh board every 10 seconds
useEffect(() => {
  const interval = setInterval(() => {
    loadBoard();
  }, 10000);

  return () => clearInterval(interval);
}, []);
```

### Pattern 2: Error Handling

```javascript
async function safeAPICall(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error.message.includes('401')) {
      // Token expired
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    } else {
      alert('Error: ' + error.message);
    }
  }
}
```

### Pattern 3: Optimistic UI Updates

```javascript
// Update UI immediately, rollback if API fails
const deleteTask = async (taskId) => {
  const oldTasks = [...tasks];
  setTasks(tasks.filter(t => t.id !== taskId));

  try {
    await kanbanAPI(`/tasks/${taskId}`, { method: 'DELETE' });
  } catch (error) {
    setTasks(oldTasks); // Rollback
    alert('Failed to delete task');
  }
};
```

---

## 🔗 Routing Setup

```javascript
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WorkspaceList from './pages/WorkspaceList';
import KanbanBoard from './pages/KanbanBoard';
import Analytics from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Your existing routes */}
        <Route path="/login" element={<Login />} />
        
        {/* New Kanban routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workspaces" element={<WorkspaceList />} />
        <Route path="/workspaces/:id" element={<KanbanBoard />} />
        <Route path="/workspaces/:id/analytics" element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## ✅ Integration Checklist

- [ ] Create `utils/api.js` helper
- [ ] Add Kanban routes to your router
- [ ] Build Workspace List page
- [ ] Build Kanban Board page
- [ ] Add "Create Task" modal
- [ ] Add "Task Detail" modal with comments
- [ ] Add "Invite Members" feature
- [ ] Build Dashboard with stats
- [ ] Add Analytics page with charts
- [ ] Test drag & drop task movement
- [ ] Test file uploads
- [ ] Add error handling
- [ ] Style components to match your theme

---

## 🎯 Quick Test Flow

1. **Login** with existing auth
2. **Create workspace**: `POST /workspaces`
3. **Open workspace**: `GET /workspaces/{id}` (shows columns + tasks)
4. **Create task**: `POST /workspaces/{id}/tasks`
5. **Move task**: `PATCH /tasks/{id}` with `column_id`
6. **Add comment**: `POST /tasks/{id}/comments`
7. **View analytics**: `GET /workspaces/{id}/analytics`

---

## 📞 API Testing

**Swagger UI:** http://localhost:8000/docs

**Quick Test:**
```bash
# Get workspaces
curl http://localhost:8000/workspaces \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create workspace
curl -X POST http://localhost:8000/workspaces \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Workspace"}'
```

---

**Need more details?** Check:
- Full API docs: `KANBAN_API_DOCS.md`
- Test script: `python test_kanban.py`
- Swagger: http://localhost:8000/docs

**Happy integrating!** 🚀
