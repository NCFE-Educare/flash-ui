# 📚 Kanban Board API - Complete Reference

Detailed API specifications for all Kanban endpoints.

> **🚀 Want to integrate quickly?** Check **`KANBAN_FRONTEND_GUIDE.md`** for copy-paste components and practical examples!

---

## 🔐 Authentication

**Your existing auth system works for all Kanban endpoints!**

All Kanban endpoints use the **same JWT token** from your current login:

```javascript
// Use your existing token from localStorage
const token = localStorage.getItem('access_token');

// Include in all Kanban API calls
fetch('/workspaces', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

---

## 📋 API Base URL

**Development:**
```
http://localhost:8000
```

**Production:**
```
https://your-domain.com
```

All endpoints below are relative to this base URL.

---

## 1️⃣ Workspaces

### Create Workspace

```http
POST /workspaces
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Math Department - Q2 2024",
  "description": "Curriculum planning and resource development"
}
```

**Response (201):**
```json
{
  "workspace": {
    "id": 1,
    "name": "Math Department - Q2 2024",
    "description": "Curriculum planning and resource development",
    "owner_id": 5,
    "created_at": "2024-04-07T10:00:00Z",
    "updated_at": "2024-04-07T10:00:00Z"
  }
}
```

**Frontend Implementation:**
```javascript
async function createWorkspace(name, description) {
  const response = await fetch('http://localhost:8000/workspaces', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, description })
  });
  
  const data = await response.json();
  return data.workspace;
}
```

---

### List My Workspaces

```http
GET /workspaces
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "workspaces": [
    {
      "id": 1,
      "name": "Math Department - Q2 2024",
      "description": "Curriculum planning",
      "owner_id": 5,
      "created_at": "2024-04-07T10:00:00Z",
      "updated_at": "2024-04-07T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Science Lab Upgrades",
      "description": "Equipment procurement",
      "owner_id": 3,
      "created_at": "2024-04-06T15:30:00Z",
      "updated_at": "2024-04-07T09:15:00Z"
    }
  ]
}
```

**Frontend Implementation:**
```javascript
async function getWorkspaces() {
  const response = await fetch('http://localhost:8000/workspaces', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return data.workspaces;
}

// Usage in React
function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState([]);
  
  useEffect(() => {
    getWorkspaces().then(setWorkspaces);
  }, []);
  
  return (
    <div>
      {workspaces.map(ws => (
        <div key={ws.id}>{ws.name}</div>
      ))}
    </div>
  );
}
```

---

### Get Workspace Details (Full Board View)

```http
GET /workspaces/{workspace_id}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "workspace": {
    "id": 1,
    "name": "Math Department - Q2 2024",
    "description": "Curriculum planning",
    "owner_id": 5,
    "created_at": "2024-04-07T10:00:00Z",
    "updated_at": "2024-04-07T10:00:00Z"
  },
  "members": [
    {
      "id": 1,
      "workspace_id": 1,
      "user_id": 5,
      "role": "owner",
      "email": "principal@school.edu",
      "username": "principal_john",
      "added_at": "2024-04-07T10:00:00Z"
    },
    {
      "id": 2,
      "workspace_id": 1,
      "user_id": 8,
      "role": "member",
      "email": "teacher@school.edu",
      "username": "teacher_mary",
      "added_at": "2024-04-07T10:05:00Z"
    }
  ],
  "columns": [
    {
      "id": 1,
      "workspace_id": 1,
      "name": "To Do",
      "position": 0,
      "color": "#6B7280",
      "created_at": "2024-04-07T10:00:00Z"
    },
    {
      "id": 2,
      "workspace_id": 1,
      "name": "In Progress",
      "position": 1,
      "color": "#3B82F6",
      "created_at": "2024-04-07T10:00:00Z"
    },
    {
      "id": 3,
      "workspace_id": 1,
      "name": "Review",
      "position": 2,
      "color": "#F59E0B",
      "created_at": "2024-04-07T10:00:00Z"
    },
    {
      "id": 4,
      "workspace_id": 1,
      "name": "Done",
      "position": 3,
      "color": "#10B981",
      "created_at": "2024-04-07T10:00:00Z"
    }
  ],
  "tasks": [
    {
      "id": 5,
      "workspace_id": 1,
      "column_id": 1,
      "title": "Review Q1 Algebra Curriculum",
      "description": "Analyze student performance data",
      "assignee_id": 8,
      "reporter_id": 5,
      "priority": "high",
      "due_date": "2024-05-15T17:00:00Z",
      "position": 0,
      "created_at": "2024-04-07T10:10:00Z",
      "updated_at": "2024-04-07T10:10:00Z",
      "reporter_name": "principal_john",
      "reporter_email": "principal@school.edu",
      "assignee_name": "teacher_mary",
      "assignee_email": "teacher@school.edu",
      "column_name": "To Do",
      "column_color": "#6B7280"
    }
  ]
}
```

**Frontend Implementation (React Kanban Board):**
```javascript
function KanbanBoard({ workspaceId }) {
  const [board, setBoard] = useState(null);
  
  useEffect(() => {
    fetch(`http://localhost:8000/workspaces/${workspaceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setBoard);
  }, [workspaceId]);
  
  if (!board) return <div>Loading...</div>;
  
  return (
    <div className="kanban-board">
      <h1>{board.workspace.name}</h1>
      
      <div className="columns">
        {board.columns.map(column => (
          <div key={column.id} className="column">
            <h2 style={{ borderColor: column.color }}>
              {column.name}
            </h2>
            
            {board.tasks
              .filter(task => task.column_id === column.id)
              .map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            }
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Update Workspace

```http
PUT /workspaces/{workspace_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Math Department - Q3 2024",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "workspace": {
    "id": 1,
    "name": "Math Department - Q3 2024",
    "description": "Updated description",
    "owner_id": 5,
    "created_at": "2024-04-07T10:00:00Z",
    "updated_at": "2024-04-07T11:30:00Z"
  }
}
```

---

### Delete Workspace

```http
DELETE /workspaces/{workspace_id}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "deleted": true
}
```

---

## 2️⃣ Members & Invitations

### Invite Member to Workspace

```http
POST /workspaces/{workspace_id}/invite
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "teacher@school.edu"
}
```

**Response (200) - User Exists:**
```json
{
  "message": "User added to workspace",
  "member": {
    "id": 3,
    "workspace_id": 1,
    "user_id": 8,
    "role": "member",
    "added_at": "2024-04-07T10:15:00Z"
  },
  "user_exists": true
}
```

**Response (200) - User Doesn't Exist (Invitation Sent):**
```json
{
  "message": "Invitation sent",
  "invitation": {
    "id": 5,
    "workspace_id": 1,
    "email": "newteacher@school.edu",
    "invited_by": 5,
    "token": "abc123-def456-ghi789",
    "status": "pending",
    "created_at": "2024-04-07T10:15:00Z",
    "expires_at": "2024-04-14T10:15:00Z"
  },
  "user_exists": false
}
```

**Frontend Implementation:**
```javascript
async function inviteMember(workspaceId, email) {
  const response = await fetch(`http://localhost:8000/workspaces/${workspaceId}/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  
  if (data.user_exists) {
    alert(`${email} has been added to the workspace!`);
  } else {
    alert(`Invitation sent to ${email}. They'll receive an email.`);
  }
  
  return data;
}
```

---

### List Workspace Members

```http
GET /workspaces/{workspace_id}/members
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "members": [
    {
      "id": 1,
      "workspace_id": 1,
      "user_id": 5,
      "role": "owner",
      "email": "principal@school.edu",
      "username": "principal_john",
      "added_at": "2024-04-07T10:00:00Z"
    },
    {
      "id": 2,
      "workspace_id": 1,
      "user_id": 8,
      "role": "member",
      "email": "teacher@school.edu",
      "username": "teacher_mary",
      "added_at": "2024-04-07T10:05:00Z"
    }
  ]
}
```

---

### Accept Invitation

```http
GET /invitations/accept?token={invitation_token}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "message": "Invitation accepted",
  "workspace": {
    "id": 1,
    "name": "Math Department - Q2 2024",
    "description": "Curriculum planning",
    "owner_id": 5,
    "created_at": "2024-04-07T10:00:00Z",
    "updated_at": "2024-04-07T10:00:00Z"
  }
}
```

**Frontend Flow:**
```javascript
// When user clicks invitation link with ?token=abc123
function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  useEffect(() => {
    if (token) {
      fetch(`http://localhost:8000/invitations/accept?token=${token}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
        .then(res => res.json())
        .then(data => {
          alert(`Joined ${data.workspace.name}!`);
          navigate(`/workspaces/${data.workspace.id}`);
        });
    }
  }, [token]);
  
  return <div>Accepting invitation...</div>;
}
```

---

### Get Pending Invitations

```http
GET /invitations/pending
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "invitations": [
    {
      "id": 5,
      "workspace_id": 2,
      "email": "user@school.edu",
      "invited_by": 3,
      "token": "abc123-def456",
      "status": "pending",
      "created_at": "2024-04-06T14:00:00Z",
      "expires_at": "2024-04-13T14:00:00Z",
      "workspace_name": "Science Lab Upgrades",
      "inviter_name": "admin_sarah"
    }
  ]
}
```

---

### Remove Member

```http
DELETE /workspaces/{workspace_id}/members/{user_id}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "removed": true
}
```

---

## 3️⃣ Columns

### List Columns

```http
GET /workspaces/{workspace_id}/columns
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "columns": [
    {
      "id": 1,
      "workspace_id": 1,
      "name": "To Do",
      "position": 0,
      "color": "#6B7280",
      "created_at": "2024-04-07T10:00:00Z"
    },
    {
      "id": 2,
      "workspace_id": 1,
      "name": "In Progress",
      "position": 1,
      "color": "#3B82F6",
      "created_at": "2024-04-07T10:00:00Z"
    }
  ]
}
```

---

### Create Custom Column

```http
POST /workspaces/{workspace_id}/columns
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Blocked",
  "position": 2,
  "color": "#EF4444"
}
```

**Response (201):**
```json
{
  "column": {
    "id": 5,
    "workspace_id": 1,
    "name": "Blocked",
    "position": 2,
    "color": "#EF4444",
    "created_at": "2024-04-07T11:00:00Z"
  }
}
```

---

### Update Column

```http
PUT /columns/{column_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "On Hold",
  "position": 3,
  "color": "#F59E0B"
}
```

**Response (200):**
```json
{
  "column": {
    "id": 5,
    "workspace_id": 1,
    "name": "On Hold",
    "position": 3,
    "color": "#F59E0B",
    "created_at": "2024-04-07T11:00:00Z"
  }
}
```

---

### Delete Column

```http
DELETE /columns/{column_id}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "deleted": true
}
```

**Error (400) - Column has tasks:**
```json
{
  "detail": "Cannot delete column (may have tasks)"
}
```

---

## 4️⃣ Tasks

### Create Task

```http
POST /workspaces/{workspace_id}/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "column_id": 1,
  "title": "Review Q1 Algebra Curriculum",
  "description": "Analyze student performance and identify knowledge gaps",
  "assignee_email": "teacher@school.edu",
  "priority": "high",
  "due_date": "2024-05-15T17:00:00Z",
  "position": 0
}
```

**Fields:**
- `column_id` (required) - Which column to create task in
- `title` (required) - Task title
- `description` (optional) - Detailed description
- `assignee_email` (optional) - Email of person to assign
- `priority` (optional) - "low", "medium", "high", "urgent" (default: "medium")
- `due_date` (optional) - ISO 8601 datetime
- `position` (optional) - Position in column (default: 0)

**Response (201):**
```json
{
  "task": {
    "id": 5,
    "workspace_id": 1,
    "column_id": 1,
    "title": "Review Q1 Algebra Curriculum",
    "description": "Analyze student performance and identify knowledge gaps",
    "assignee_id": 8,
    "reporter_id": 5,
    "priority": "high",
    "due_date": "2024-05-15T17:00:00Z",
    "position": 0,
    "created_at": "2024-04-07T10:30:00Z",
    "updated_at": "2024-04-07T10:30:00Z"
  }
}
```

**Frontend Implementation:**
```javascript
async function createTask(workspaceId, taskData) {
  const response = await fetch(`http://localhost:8000/workspaces/${workspaceId}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  });
  
  return await response.json();
}

// Usage
const newTask = await createTask(1, {
  column_id: 1,
  title: "Review curriculum",
  assignee_email: "teacher@school.edu",
  priority: "high",
  due_date: "2024-05-15T17:00:00Z"
});
```

---

### List Tasks in Workspace

```http
GET /workspaces/{workspace_id}/tasks
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "tasks": [
    {
      "id": 5,
      "workspace_id": 1,
      "column_id": 1,
      "title": "Review Q1 Algebra Curriculum",
      "description": "Analyze student performance",
      "assignee_id": 8,
      "reporter_id": 5,
      "priority": "high",
      "due_date": "2024-05-15T17:00:00Z",
      "position": 0,
      "created_at": "2024-04-07T10:30:00Z",
      "updated_at": "2024-04-07T10:30:00Z",
      "reporter_name": "principal_john",
      "reporter_email": "principal@school.edu",
      "assignee_name": "teacher_mary",
      "assignee_email": "teacher@school.edu",
      "column_name": "To Do",
      "column_color": "#6B7280"
    }
  ]
}
```

---

### Get Task Details

```http
GET /tasks/{task_id}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "task": {
    "id": 5,
    "workspace_id": 1,
    "column_id": 1,
    "title": "Review Q1 Algebra Curriculum",
    "description": "Analyze student performance",
    "assignee_id": 8,
    "reporter_id": 5,
    "priority": "high",
    "due_date": "2024-05-15T17:00:00Z",
    "position": 0,
    "created_at": "2024-04-07T10:30:00Z",
    "updated_at": "2024-04-07T10:30:00Z"
  },
  "comments": [
    {
      "id": 1,
      "task_id": 5,
      "user_id": 8,
      "comment": "Started working on this!",
      "created_at": "2024-04-07T11:00:00Z",
      "username": "teacher_mary",
      "email": "teacher@school.edu"
    }
  ],
  "attachments": [
    {
      "id": 1,
      "task_id": 5,
      "user_id": 8,
      "file_name": "Q1_Results.pdf",
      "file_url": "/uploads/abc123.pdf",
      "file_type": "application/pdf",
      "file_size": 204800,
      "created_at": "2024-04-07T11:15:00Z",
      "username": "teacher_mary"
    }
  ]
}
```

---

### Update Task (Move, Edit, Reassign)

```http
PATCH /tasks/{task_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "column_id": 2,
  "title": "Review Q1 Algebra Curriculum (Updated)",
  "assignee_email": "newteacher@school.edu",
  "priority": "urgent",
  "position": 0
}
```

**All fields are optional - only send what you want to update:**
- `title` - Update title
- `description` - Update description
- `column_id` - Move to different column (drag & drop)
- `assignee_email` - Reassign to different user (or empty string to unassign)
- `priority` - Change priority
- `due_date` - Update due date
- `position` - Change position in column

**Response (200):**
```json
{
  "task": {
    "id": 5,
    "workspace_id": 1,
    "column_id": 2,
    "title": "Review Q1 Algebra Curriculum (Updated)",
    "description": "Analyze student performance",
    "assignee_id": 10,
    "reporter_id": 5,
    "priority": "urgent",
    "due_date": "2024-05-15T17:00:00Z",
    "position": 0,
    "created_at": "2024-04-07T10:30:00Z",
    "updated_at": "2024-04-07T12:00:00Z"
  }
}
```

**Frontend: Drag & Drop Example:**
```javascript
function onDragEnd(result) {
  if (!result.destination) return;
  
  const taskId = result.draggableId;
  const newColumnId = result.destination.droppableId;
  const newPosition = result.destination.index;
  
  // Update task position
  fetch(`http://localhost:8000/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      column_id: newColumnId,
      position: newPosition
    })
  })
    .then(res => res.json())
    .then(data => {
      console.log('Task moved!', data.task);
      // Refresh board
    });
}
```

---

### Delete Task

```http
DELETE /tasks/{task_id}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "deleted": true
}
```

---

## 5️⃣ Comments

### Add Comment

```http
POST /tasks/{task_id}/comments
Authorization: Bearer {token}
Content-Type: application/json

{
  "comment": "Started working on this. Will have updates by Friday."
}
```

**Response (201):**
```json
{
  "comment": {
    "id": 1,
    "task_id": 5,
    "user_id": 8,
    "comment": "Started working on this. Will have updates by Friday.",
    "created_at": "2024-04-07T11:00:00Z"
  }
}
```

**Frontend Implementation:**
```javascript
function CommentSection({ taskId }) {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  
  const addComment = async () => {
    const response = await fetch(`http://localhost:8000/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comment })
    });
    
    const data = await response.json();
    setComments([...comments, data.comment]);
    setComment('');
  };
  
  return (
    <div>
      <textarea value={comment} onChange={e => setComment(e.target.value)} />
      <button onClick={addComment}>Add Comment</button>
      
      {comments.map(c => (
        <div key={c.id}>{c.comment}</div>
      ))}
    </div>
  );
}
```

---

### List Comments

```http
GET /tasks/{task_id}/comments
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "comments": [
    {
      "id": 1,
      "task_id": 5,
      "user_id": 8,
      "comment": "Started working on this!",
      "created_at": "2024-04-07T11:00:00Z",
      "username": "teacher_mary",
      "email": "teacher@school.edu"
    },
    {
      "id": 2,
      "task_id": 5,
      "user_id": 5,
      "comment": "Great! Let me know if you need help.",
      "created_at": "2024-04-07T11:05:00Z",
      "username": "principal_john",
      "email": "principal@school.edu"
    }
  ]
}
```

---

## 6️⃣ Attachments

### Upload Attachment

```http
POST /tasks/{task_id}/attachments
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: (binary file data)
```

**Response (201):**
```json
{
  "attachment": {
    "id": 1,
    "task_id": 5,
    "user_id": 8,
    "file_name": "Q1_Results.pdf",
    "file_url": "/uploads/abc123.pdf",
    "file_type": "application/pdf",
    "file_size": 204800,
    "created_at": "2024-04-07T11:15:00Z"
  }
}
```

**Frontend Implementation:**
```javascript
async function uploadAttachment(taskId, file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`http://localhost:8000/tasks/${taskId}/attachments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type - browser sets it with boundary
    },
    body: formData
  });
  
  return await response.json();
}

// Usage in React
function FileUpload({ taskId }) {
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const result = await uploadAttachment(taskId, file);
      console.log('File uploaded:', result.attachment);
    }
  };
  
  return <input type="file" onChange={handleFileChange} />;
}
```

---

### List Attachments

```http
GET /tasks/{task_id}/attachments
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "attachments": [
    {
      "id": 1,
      "task_id": 5,
      "user_id": 8,
      "file_name": "Q1_Results.pdf",
      "file_url": "/uploads/abc123.pdf",
      "file_type": "application/pdf",
      "file_size": 204800,
      "created_at": "2024-04-07T11:15:00Z",
      "username": "teacher_mary"
    }
  ]
}
```

**Download File:**
```javascript
function downloadAttachment(fileUrl, fileName) {
  // Files are publicly accessible at /uploads/
  const link = document.createElement('a');
  link.href = `http://localhost:8000${fileUrl}`;
  link.download = fileName;
  link.click();
}
```

---

## 7️⃣ Activity Log

### Get Workspace Activity

```http
GET /workspaces/{workspace_id}/activity?limit=50
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional) - Max number of events (default: 50)

**Response (200):**
```json
{
  "activity": [
    {
      "id": 15,
      "workspace_id": 1,
      "task_id": 5,
      "user_id": 8,
      "action": "task_updated",
      "description": "Moved from 'To Do' to 'In Progress'",
      "created_at": "2024-04-07T12:00:00Z",
      "username": "teacher_mary",
      "email": "teacher@school.edu"
    },
    {
      "id": 14,
      "workspace_id": 1,
      "task_id": 5,
      "user_id": 8,
      "action": "comment_added",
      "description": "Added a comment",
      "created_at": "2024-04-07T11:00:00Z",
      "username": "teacher_mary",
      "email": "teacher@school.edu"
    },
    {
      "id": 13,
      "workspace_id": 1,
      "task_id": 5,
      "user_id": 5,
      "action": "task_created",
      "description": "Created task 'Review Q1 Algebra Curriculum' to teacher_mary",
      "created_at": "2024-04-07T10:30:00Z",
      "username": "principal_john",
      "email": "principal@school.edu"
    }
  ]
}
```

**Frontend: Timeline View:**
```javascript
function ActivityTimeline({ workspaceId }) {
  const [activity, setActivity] = useState([]);
  
  useEffect(() => {
    fetch(`http://localhost:8000/workspaces/${workspaceId}/activity?limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setActivity(data.activity));
  }, [workspaceId]);
  
  return (
    <div className="timeline">
      {activity.map(event => (
        <div key={event.id} className="timeline-event">
          <strong>{event.username}</strong>
          <span>{event.description}</span>
          <time>{new Date(event.created_at).toLocaleString()}</time>
        </div>
      ))}
    </div>
  );
}
```

---

## 8️⃣ Analytics

### Get Workspace Analytics

```http
GET /workspaces/{workspace_id}/analytics
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "tasks_by_column": [
    { "column_name": "To Do", "color": "#6B7280", "task_count": 5 },
    { "column_name": "In Progress", "color": "#3B82F6", "task_count": 3 },
    { "column_name": "Review", "color": "#F59E0B", "task_count": 2 },
    { "column_name": "Done", "color": "#10B981", "task_count": 12 }
  ],
  "tasks_by_priority": [
    { "priority": "urgent", "count": 2 },
    { "priority": "high", "count": 5 },
    { "priority": "medium", "count": 10 },
    { "priority": "low", "count": 5 }
  ],
  "tasks_by_assignee": [
    { "username": "teacher_mary", "email": "teacher@school.edu", "task_count": 8 },
    { "username": "teacher_john", "email": "teacher_john@school.edu", "task_count": 5 }
  ],
  "overdue_tasks": [
    {
      "id": 3,
      "title": "Order textbooks",
      "due_date": "2024-04-05T17:00:00Z",
      "assignee_name": "teacher_john"
    }
  ],
  "completion_rate": 54.55,
  "total_tasks": 22,
  "completed_tasks": 12,
  "tasks_over_time": [
    { "date": "2024-04-01", "count": 3 },
    { "date": "2024-04-02", "count": 5 },
    { "date": "2024-04-03", "count": 2 }
  ],
  "member_activity": [
    {
      "username": "teacher_mary",
      "email": "teacher@school.edu",
      "tasks_assigned": 8,
      "comments_made": 15,
      "files_uploaded": 3
    }
  ]
}
```

**Frontend: Charts with Recharts:**
```javascript
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis } from 'recharts';

function Analytics({ workspaceId }) {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    fetch(`http://localhost:8000/workspaces/${workspaceId}/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setAnalytics);
  }, [workspaceId]);
  
  if (!analytics) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Workspace Analytics</h2>
      
      {/* Completion Rate */}
      <div className="stat-card">
        <h3>Completion Rate</h3>
        <div className="big-number">{analytics.completion_rate}%</div>
        <p>{analytics.completed_tasks} of {analytics.total_tasks} tasks completed</p>
      </div>
      
      {/* Pie Chart: Tasks by Priority */}
      <PieChart width={400} height={400}>
        <Pie 
          data={analytics.tasks_by_priority} 
          dataKey="count" 
          nameKey="priority" 
        />
      </PieChart>
      
      {/* Bar Chart: Tasks by User */}
      <BarChart width={600} height={300} data={analytics.tasks_by_assignee}>
        <XAxis dataKey="username" />
        <YAxis />
        <Bar dataKey="task_count" fill="#3B82F6" />
      </BarChart>
      
      {/* Overdue Tasks Alert */}
      {analytics.overdue_tasks.length > 0 && (
        <div className="alert">
          <h4>⚠️ {analytics.overdue_tasks.length} Overdue Tasks</h4>
          {analytics.overdue_tasks.map(task => (
            <div key={task.id}>{task.title}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Get My Personal Analytics

```http
GET /analytics/me
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "my_tasks": [
    {
      "id": 5,
      "title": "Review Q1 Algebra Curriculum",
      "priority": "high",
      "due_date": "2024-05-15T17:00:00Z",
      "workspace_name": "Math Department",
      "column_name": "In Progress"
    }
  ],
  "tasks_by_status": [
    { "column_name": "To Do", "count": 3 },
    { "column_name": "In Progress", "count": 5 },
    { "column_name": "Done", "count": 12 }
  ],
  "overdue_count": 2,
  "tasks_by_workspace": [
    { "workspace_name": "Math Department", "workspace_id": 1, "task_count": 8 },
    { "workspace_name": "Science Lab", "workspace_id": 2, "task_count": 5 }
  ],
  "activity_stats": {
    "tasks_created": 15,
    "comments_made": 23,
    "files_uploaded": 7
  }
}
```

---

### Get Global Analytics

```http
GET /analytics/global
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "totals": {
    "total_workspaces": 5,
    "total_users": 25,
    "total_tasks": 150,
    "completed_tasks": 85
  },
  "active_workspaces": [
    { "id": 1, "name": "Math Department", "task_count": 45, "member_count": 8 },
    { "id": 2, "name": "Science Lab", "task_count": 30, "member_count": 5 }
  ],
  "active_users": [
    { "username": "teacher_mary", "email": "teacher@school.edu", "tasks_assigned": 25, "comments_made": 50 }
  ],
  "tasks_trend": [
    { "date": "2024-04-01", "count": 10 },
    { "date": "2024-04-02", "count": 15 }
  ]
}
```

---

### Get Dashboard Summary

```http
GET /dashboard/summary
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "workspaces_count": 3,
  "active_tasks": 8,
  "overdue_tasks": 2,
  "completed_this_week": 5,
  "pending_invitations": 1,
  "upcoming_tasks": [
    {
      "id": 5,
      "title": "Review curriculum",
      "priority": "high",
      "due_date": "2024-04-10T17:00:00Z",
      "workspace_name": "Math Department",
      "column_name": "In Progress"
    }
  ]
}
```

**Frontend: Dashboard:**
```javascript
function Dashboard() {
  const [summary, setSummary] = useState(null);
  
  useEffect(() => {
    fetch('http://localhost:8000/dashboard/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setSummary);
  }, []);
  
  if (!summary) return <div>Loading...</div>;
  
  return (
    <div className="dashboard">
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
          <h3>Completed This Week</h3>
          <div className="big-number">{summary.completed_this_week}</div>
        </div>
      </div>
      
      <h3>Upcoming Tasks</h3>
      {summary.upcoming_tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

---

## 🔴 Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "detail": "Missing credentials"
}
```
**Fix:** Include `Authorization: Bearer {token}` header

---

**403 Forbidden:**
```json
{
  "detail": "Not a member of this workspace"
}
```
**Fix:** User doesn't have access to this workspace

---

**404 Not Found:**
```json
{
  "detail": "Workspace not found"
}
```
**Fix:** Resource doesn't exist

---

**400 Bad Request:**
```json
{
  "detail": "User user@example.com not found"
}
```
**Fix:** Invalid input data

---

**Frontend Error Handling:**
```javascript
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 401) {
        // Token expired - redirect to login
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      } else if (response.status === 403) {
        alert('You don\'t have permission for this action');
      } else if (response.status === 404) {
        alert('Resource not found');
      } else {
        alert(error.detail || 'An error occurred');
      }
      
      throw new Error(error.detail);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## 🎨 Frontend Architecture Example

### Complete React App Structure

```javascript
// App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/workspaces" element={<ProtectedRoute><WorkspaceList /></ProtectedRoute>} />
        <Route path="/workspaces/:id" element={<ProtectedRoute><KanbanBoard /></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/invitations/accept" element={<ProtectedRoute><AcceptInvitation /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

// ProtectedRoute.js
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

// Login.js
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    const response = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      navigate('/');
    } else {
      alert('Login failed');
    }
  };
  
  return (
    <form onSubmit={handleLogin}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## 🚀 Quick Start Checklist

**For Frontend Developers:**

- [ ] Get API running locally: `uvicorn api:app --reload`
- [ ] Test Swagger UI: http://localhost:8000/docs
- [ ] Create test account via `/auth/signup`
- [ ] Save token to `localStorage`
- [ ] Test creating a workspace
- [ ] Test creating tasks
- [ ] Implement drag & drop for tasks
- [ ] Build Kanban board UI
- [ ] Add charts for analytics
- [ ] Implement file uploads
- [ ] Add real-time updates (optional - via polling or WebSockets)

---

## 📞 Support

- **Swagger Docs:** http://localhost:8000/docs
- **Test Script:** `python test_kanban.py`
- **Full README:** See `KANBAN_README.md`

---

**Happy Coding!** 🎉
