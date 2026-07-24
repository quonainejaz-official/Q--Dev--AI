# Q-Dev-AI API Documentation

This API documentation provides endpoints for building a PWA mobile application for the Q-Dev-AI chatbot platform.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most endpoints require authentication via JWT token stored in HTTP-only cookies. The token is automatically set during login/registration.

## Response Format

All responses follow this format:

**Success Response:**
```json
{
  "data": { ... },
  "status": "success"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "status": "error"
}
```

---

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "",
    "preferences": { ... }
  }
}
```

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "",
    "preferences": { ... }
  }
}
```

### Google Authentication
```http
POST /api/auth/google
```

**Request Body:**
```json
{
  "credential": "google_id_token"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "preferences": { ... }
  }
}
```

### Get Current User
```http
GET /api/auth/me
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "",
    "preferences": { ... }
  }
}
```

### Logout
```http
POST /api/auth/logout
```

**Response:**
```json
{
  "status": "success"
}
```

---

## User Management Endpoints

### Get User Profile
```http
GET /api/users/profile
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "",
    "preferences": {
      "theme": "system",
      "language": "en",
      "notifications": true,
      "fontSize": "medium"
    }
  }
}
```

### Update User Profile
```http
PUT /api/users/profile
```

**Request Body:**
```json
{
  "name": "John Updated",
  "avatar": "https://new-avatar-url"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Updated",
    "avatar": "https://new-avatar-url",
    "preferences": { ... }
  }
}
```

### Update User Preferences
```http
PUT /api/users/preferences
```

**Request Body:**
```json
{
  "theme": "dark",
  "language": "en",
  "notifications": false,
  "fontSize": "large"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "",
    "preferences": {
      "theme": "dark",
      "language": "en",
      "notifications": false,
      "fontSize": "large"
    }
  }
}
```

### Change Password
```http
POST /api/users/change-password
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password changed successfully"
}
```

### Delete Account
```http
DELETE /api/users/account
```

**Request Body:**
```json
{
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Account deleted successfully"
}
```

---

## Chat Management Endpoints

### List Chats
```http
GET /api/chats?limit=50&cursor=2024-01-01T00:00:00.000Z
```

**Query Parameters:**
- `limit` (optional): Number of chats to return (default: 50, max: 200)
- `cursor` (optional): ISO timestamp for pagination

**Response:**
```json
{
  "chats": [
    {
      "id": "chat_id",
      "_id": "chat_id",
      "title": "Chat Title",
      "titleIsCustom": false,
      "messageCount": 5,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "2024-01-01T00:00:00.000Z"
}
```

### Get Chat
```http
GET /api/chats/:id
```

**Response:**
```json
{
  "chat": {
    "id": "chat_id",
    "_id": "chat_id",
    "title": "Chat Title",
    "titleIsCustom": false,
    "messageCount": 5,
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "messages": [
      {
        "_id": "message_id",
        "role": "user",
        "content": "Hello",
        "timestamp": 1234567890,
        "images": [],
        "audios": [],
        "videos": [],
        "pdfs": [],
        "model": "gpt-4",
        "tokensIn": 10,
        "tokensOut": 20,
        "finishReason": "stop"
      }
    ]
  }
}
```

### Create Chat
```http
POST /api/chats
```

**Request Body:**
```json
{
  "clientId": "client-generated-id",
  "title": "New Chat",
  "titleIsCustom": false,
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": 1234567890,
      "images": [],
      "audios": [],
      "videos": [],
      "pdfs": []
    }
  ]
}
```

**Response:**
```json
{
  "chat": {
    "id": "chat_id",
    "_id": "chat_id",
    "title": "New Chat",
    "titleIsCustom": false,
    "messageCount": 1,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Chat
```http
PUT /api/chats/:id
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "titleIsCustom": true,
  "messages": [...]
}
```

**Response:**
```json
{
  "chat": {
    "id": "chat_id",
    "_id": "chat_id",
    "title": "Updated Title",
    "titleIsCustom": true,
    "messageCount": 5,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Delete Chat
```http
DELETE /api/chats/:id
```

**Response:**
```json
{
  "status": "success"
}
```

### Migrate Chats
```http
POST /api/chats/migrate
```

**Request Body:**
```json
{
  "chats": [
    {
      "clientId": "client-id",
      "title": "Guest Chat",
      "titleIsCustom": false,
      "messages": [...]
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "migrated": 5
}
```

### Search Messages
```http
GET /api/chats/search?q=search-term
```

**Query Parameters:**
- `q`: Search query

**Response:**
```json
{
  "results": [
    {
      "chatId": "chat_id",
      "messageId": "message_id",
      "content": "Message content",
      "role": "user",
      "timestamp": 1234567890
    }
  ]
}
```

---

## Message Management Endpoints

### Get Message
```http
GET /api/messages/:id
```

**Response:**
```json
{
  "message": {
    "_id": "message_id",
    "role": "user",
    "content": "Hello",
    "timestamp": 1234567890,
    "images": [],
    "audios": [],
    "videos": [],
    "pdfs": [],
    "model": "gpt-4",
    "tokensIn": 10,
    "tokensOut": 20,
    "finishReason": "stop"
  }
}
```

### Edit Message
```http
PUT /api/messages/:id
```

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

**Response:**
```json
{
  "message": {
    "_id": "message_id",
    "role": "user",
    "content": "Updated message content",
    "timestamp": 1234567890,
    "images": [],
    "audios": [],
    "videos": [],
    "pdfs": [],
    "model": "gpt-4",
    "tokensIn": 10,
    "tokensOut": 20,
    "finishReason": "stop"
  }
}
```

### Delete Message
```http
DELETE /api/messages/:id
```

**Response:**
```json
{
  "status": "success",
  "message": "Message deleted successfully"
}
```

### Bulk Delete Messages
```http
POST /api/messages/bulk-delete
```

**Request Body:**
```json
{
  "messageIds": ["msg_id_1", "msg_id_2", "msg_id_3"]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Deleted 3 messages successfully"
}
```

---

## Messaging Endpoints

### Send Message (Streaming)
```http
POST /api/message
```

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "history": [
    {
      "role": "user",
      "content": "Previous message",
      "timestamp": 1234567890
    }
  ],
  "images": ["https://image-url"],
  "audios": [],
  "videos": [],
  "pdfs": []
}
```

**Response:** Server-Sent Events (SSE)

**Event Types:**
- `typing`: Indicates if bot is typing
- `start`: Marks start of response
- `chunk`: Streaming text chunks
- `done`: Response completed with usage info
- `error`: Error occurred

### Generate Image
```http
POST /api/generate-image
```

**Request Body:**
```json
{
  "prompt": "A beautiful sunset over mountains"
}
```

**Response:** Server-Sent Events (SSE)

**Event Types:**
- `typing`: Indicates generation in progress
- `image`: Generated image data
- `done`: Generation completed
- `error`: Error occurred

### Get History
```http
GET /api/history
```

**Response:**
```json
{
  "messages": []
}
```

### Clear History
```http
DELETE /api/history
```

**Response:**
```json
{
  "status": "success",
  "message": "Chat history cleared"
}
```

### Set History
```http
PUT /api/history
```

**Request Body:**
```json
{
  "messages": [...]
}
```

**Response:**
```json
{
  "status": "success",
  "messages": []
}
```

---

## Media Management Endpoints

### Upload Single File
```http
POST /api/media/upload
```

**Request Body:**
```json
{
  "file": "base64_encoded_file",
  "resourceType": "image"
}
```

**Response:**
```json
{
  "url": "https://cloudinary-url",
  "publicId": "public_id",
  "resourceType": "image"
}
```

### Upload Multiple Files
```http
POST /api/media/upload/batch
```

**Request Body:**
```json
{
  "files": ["file1_base64", "file2_base64"],
  "resourceType": "image"
}
```

**Response:**
```json
{
  "files": [
    {
      "url": "https://cloudinary-url-1",
      "publicId": "public_id_1",
      "resourceType": "image"
    },
    {
      "url": "https://cloudinary-url-2",
      "publicId": "public_id_2",
      "resourceType": "image"
    }
  ]
}
```

### Delete File
```http
DELETE /api/media/delete
```

**Request Body:**
```json
{
  "publicId": "public_id",
  "resourceType": "image"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "File deleted successfully"
}
```

### Get File Info
```http
GET /api/media/:publicId
```

**Response:**
```json
{
  "publicId": "public_id",
  "url": "https://cloudinary-url"
}
```

---

## Search Endpoints

### Search
```http
GET /api/search?q=query
```

**Query Parameters:**
- `q`: Search query

**Response:**
```json
{
  "results": [...]
}
```

---

## Health Endpoints

### Health Check
```http
GET /healthz
```

**Response:**
```json
{
  "status": "ok"
}
```

### Readiness Check
```http
GET /readyz
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (e.g., email already registered)
- `503` - Service Unavailable (e.g., database not configured)

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Auth endpoints: 10 requests per 15 minutes
- Chat endpoints: 100 requests per 15 minutes
- General API: 50 requests per 15 minutes

## PWA-Specific Features

### User Preferences
The API supports user preferences that are useful for PWA:
- **Theme**: light, dark, system
- **Language**: for i18n support
- **Notifications**: for push notification preferences
- **FontSize**: small, medium, large

### Offline Support
- Chats are stored locally and can be migrated when user logs in
- Media files are uploaded to Cloudinary for persistent access
- User preferences are synced across devices

### Mobile Optimizations
- Cursor-based pagination for efficient data loading
- Bulk operations for managing multiple messages
- Soft delete for data recovery
- Media upload optimization for mobile networks

---

## WebSocket Support (Future)

For real-time features in PWA, consider adding WebSocket support for:
- Live typing indicators
- Real-time message sync across devices
- Push notification integration
- Live collaboration features

---

## Testing the API

Use the provided test files in the `/tests` directory to verify API functionality:

```bash
npm test
```

---

## Deployment Notes

For PWA deployment:
1. Ensure CORS is properly configured for your PWA domain
2. Set up HTTPS for secure communication
3. Configure Cloudinary for media storage
4. Set up MongoDB for persistent data
5. Configure environment variables for production
