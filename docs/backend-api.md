# CBSE Teaching Assistant API Documentation

Base URL: `http://localhost:8001`

## Table of Contents
- [Authentication](#authentication)
- [General Endpoints](#general-endpoints)
- [Teacher Management](#teacher-management)
- [LiveKit Token](#livekit-token)
- [Circular Management](#circular-management)
- [Search](#search)
- [Statistics](#statistics)
- [Error Responses](#error-responses)

---

## Authentication

Currently, the API does not require authentication tokens. All endpoints are publicly accessible.

---

## General Endpoints

### Get API Info
Get basic API information and available endpoints.

**Endpoint:** `GET /`

**Response:**
```json
{
  "message": "CBSE Teaching Assistant API",
  "version": "1.0",
  "endpoints": {
    "teacher_registration": "/api/teachers/register",
    "get_token": "/api/get-token",
    "list_circulars": "/api/circulars",
    "upload_circular": "/api/circulars/upload"
  }
}
```

---

### Health Check
Check the health status of the API and connected services.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "pinecone": "connected"
}
```

---

## Teacher Management

### Register Teacher
Register a new teacher in the system.

**Endpoint:** `POST /api/teachers/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "whatsapp": "+1234567890",
  "subjects": ["Mathematics", "Physics"],
  "grades": ["9", "10", "11"],
  "notification_channels": ["email"]
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Teacher's full name |
| email | string | Yes | Valid email address |
| phone | string | No | Phone number |
| whatsapp | string | No | WhatsApp number |
| subjects | array[string] | No | List of subjects taught |
| grades | array[string] | No | List of grades taught |
| notification_channels | array[string] | No | Must be ["email"] only |

**Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "subjects": ["Mathematics", "Physics"],
  "grades": ["9", "10", "11"],
  "notification_channels": ["email"],
  "created_at": "2026-04-06T10:30:00"
}
```

**Errors:**
- `400` - Teacher with this email already exists
- `422` - Invalid email format or notification channels

---

### Get Teacher by ID
Retrieve a specific teacher's information.

**Endpoint:** `GET /api/teachers/{teacher_id}`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| teacher_id | string | Unique teacher identifier |

**Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "subjects": ["Mathematics", "Physics"],
  "grades": ["9", "10", "11"],
  "notification_channels": ["email"],
  "created_at": "2026-04-06T10:30:00"
}
```

**Errors:**
- `404` - Teacher not found

---

### List All Teachers
Get a list of all registered teachers.

**Endpoint:** `GET /api/teachers`

**Response:** `200 OK`
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "subjects": ["Mathematics", "Physics"],
    "grades": ["9", "10", "11"],
    "notification_channels": ["email"],
    "created_at": "2026-04-06T10:30:00"
  }
]
```

---

## LiveKit Token

### Generate LiveKit Access Token
Generate a LiveKit access token for starting a video session with the AI assistant.

**Endpoint:** `GET /api/get-token`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| participant | string | Yes | Participant identifier/name |
| teacher_id | string | No | Optional teacher ID for context |

**Example Request:**
```
GET /api/get-token?participant=teacher_001&teacher_id=123e4567-e89b-12d3-a456-426614174000
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "url": "wss://your-livekit-server.com",
  "room_name": "cbse-assistant-abc123def456"
}
```

**Errors:**
- `500` - LiveKit API credentials not configured

---

## Circular Management

### List Circulars
Get a list of circulars with optional filtering.

**Endpoint:** `GET /api/circulars`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | integer | No | 20 | Number of results (1-100) |
| category | string | No | null | Filter by category |

**Example Request:**
```
GET /api/circulars?limit=10&category=academic
```

**Response:** `200 OK`
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "circular_id": "CBSE/2026/001",
    "title": "Annual Examination Schedule 2026",
    "date": "2026-04-01T00:00:00",
    "category": "academic",
    "url": "https://cbse.gov.in/circular/001",
    "processed": true,
    "created_at": "2026-04-06T10:30:00"
  }
]
```

---

### Get Circular by ID
Retrieve a specific circular's details.

**Endpoint:** `GET /api/circulars/{circular_id}`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| circular_id | string | Unique circular identifier |

**Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "circular_id": "CBSE/2026/001",
  "title": "Annual Examination Schedule 2026",
  "date": "2026-04-01T00:00:00",
  "category": "academic",
  "url": "https://cbse.gov.in/circular/001",
  "processed": true,
  "created_at": "2026-04-06T10:30:00"
}
```

**Errors:**
- `404` - Circular not found

---

### Upload Circular
Manually upload a circular with PDF files.

**Endpoint:** `POST /api/circulars/upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Circular title |
| circular_id | string | Yes | Unique circular identifier |
| category | string | No | Category (default: "general") |
| date | string | Yes | ISO format date (YYYY-MM-DD) |
| files | file[] | Yes | PDF file(s) to upload |

**Example Request:**
```javascript
const formData = new FormData();
formData.append('title', 'Exam Schedule 2026');
formData.append('circular_id', 'CBSE/2026/001');
formData.append('category', 'academic');
formData.append('date', '2026-04-01');
formData.append('files', pdfFile1);
formData.append('files', pdfFile2);

fetch('http://localhost:8000/api/circulars/upload', {
  method: 'POST',
  body: formData
});
```

**Response:** `200 OK`
```json
{
  "message": "Circular uploaded successfully",
  "circular_id": "123e4567-e89b-12d3-a456-426614174000",
  "files_processed": 2,
  "chunks_created": 45
}
```

**Errors:**
- `400` - Circular with this ID already exists

---

### Delete Circular
Delete a circular and all associated data.

**Endpoint:** `DELETE /api/circulars/{circular_id}`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| circular_id | string | Unique circular identifier |

**Response:** `200 OK`
```json
{
  "message": "Circular deleted successfully"
}
```

**Errors:**
- `404` - Circular not found

---

## Search

### Search Circulars
Search through circulars using natural language queries (RAG-powered).

**Endpoint:** `GET /api/search`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | - | Search query (min 3 characters) |
| category | string | No | null | Filter by category |
| limit | integer | No | 5 | Number of results (1-20) |

**Example Request:**
```
GET /api/search?query=examination%20dates&category=academic&limit=10
```

**Response:** `200 OK`
```json
{
  "query": "examination dates",
  "results": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "circular_id": "CBSE/2026/001",
      "title": "Annual Examination Schedule 2026",
      "content": "Relevant excerpt from the circular...",
      "score": 0.89,
      "metadata": {
        "date": "2026-04-01T00:00:00",
        "category": "academic",
        "url": "https://cbse.gov.in/circular/001"
      }
    }
  ],
  "count": 1
}
```

**Errors:**
- `422` - Query too short (minimum 3 characters)

---

## Statistics

### Get System Statistics
Get overall statistics about the system.

**Endpoint:** `GET /api/stats`

**Response:** `200 OK`
```json
{
  "teachers": 25,
  "circulars": 150,
  "processed_circulars": 148,
  "pinecone_vectors": 3456
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message description"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input or duplicate resource |
| 404 | Not Found - Resource does not exist |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - Server-side error |

---

## Frontend Integration Examples

### React/TypeScript Example

```typescript
// Register a teacher
const registerTeacher = async (teacherData: TeacherCreate) => {
  const response = await fetch('http://localhost:8000/api/teachers/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(teacherData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to register teacher');
  }
  
  return await response.json();
};

// Get LiveKit token
const getToken = async (participant: string, teacherId?: string) => {
  const params = new URLSearchParams({ participant });
  if (teacherId) params.append('teacher_id', teacherId);
  
  const response = await fetch(
    `http://localhost:8000/api/get-token?${params}`
  );
  
  return await response.json();
};

// Search circulars
const searchCirculars = async (query: string, category?: string) => {
  const params = new URLSearchParams({ query });
  if (category) params.append('category', category);
  
  const response = await fetch(
    `http://localhost:8000/api/search?${params}`
  );
  
  return await response.json();
};

// Upload circular
const uploadCircular = async (
  title: string,
  circularId: string,
  date: string,
  files: File[],
  category = 'general'
) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('circular_id', circularId);
  formData.append('category', category);
  formData.append('date', date);
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  const response = await fetch('http://localhost:8000/api/circulars/upload', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
};
```

---

## Notes

1. **CORS**: The API currently allows all origins (`*`). Update this in production.
2. **File Uploads**: Maximum file size limits are handled by the server configuration.
3. **Date Format**: All dates should be in ISO 8601 format (`YYYY-MM-DDTHH:MM:SS`).
4. **Notification Channels**: Currently only `["email"]` is supported.
5. **LiveKit**: Requires proper LiveKit credentials in environment variables.
6. **RAG Search**: Powered by Pinecone vector database for semantic search.
