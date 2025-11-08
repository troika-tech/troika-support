# API Testing Guide

Quick guide to test the Sales Captain API endpoints.

## Setup

1. **Start MongoDB:**
   ```bash
   # Windows
   net start MongoDB

   # macOS/Linux
   brew services start mongodb-community
   ```

2. **Start Redis (Optional):**
   ```bash
   redis-server
   ```

3. **Start Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```

   Server should be running on http://localhost:5000

## Authentication Endpoints

Base URL: `http://localhost:5000/api/auth`

### 1. Register a New User

**Endpoint:** `POST /api/auth/register`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@salescaptain.com",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "super_admin"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "email": "admin@salescaptain.com",
      "role": "super_admin",
      "profile": {
        "firstName": "Admin",
        "lastName": "User"
      },
      "companyId": "...",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Notes:**
- First super_admin user creates a default company automatically
- Password is hashed automatically
- Refresh token is set as httpOnly cookie

---

### 2. Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@salescaptain.com",
    "password": "Admin123!"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "email": "admin@salescaptain.com",
      "role": "super_admin",
      "profile": {
        "firstName": "Admin",
        "lastName": "User"
      },
      "lastLogin": "2025-11-06T..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Save the accessToken for subsequent requests!**

---

### 3. Get Current User

**Endpoint:** `GET /api/auth/me`

**Request:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "_id": "...",
      "email": "admin@salescaptain.com",
      "role": "super_admin",
      "profile": {
        "firstName": "Admin",
        "lastName": "User"
      },
      "companyId": {
        "_id": "...",
        "name": "Default Company",
        "logo": null
      },
      "teamId": null,
      "groupId": null
    }
  }
}
```

---

### 4. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh-token`

**Request (with cookie):**
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -b "refreshToken=YOUR_REFRESH_TOKEN"
```

**Request (with body):**
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Access token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 5. Logout

**Endpoint:** `POST /api/auth/logout`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

---

### 6. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@salescaptain.com"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent",
  "data": null
}
```

**Note:** Currently logs to console. Email functionality needs to be implemented.

---

### 7. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "RESET_TOKEN",
    "newPassword": "NewPassword123!"
  }'
```

**Note:** Token generation and verification needs to be implemented.

---

### 8. Change Password (Authenticated)

**Endpoint:** `POST /api/auth/change-password`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword123!"
  }'
```

**Note:** Implementation pending.

---

## Testing with Postman

### 1. Import Collection

Create a new Postman collection with these requests.

### 2. Environment Variables

Set these variables:
- `base_url`: `http://localhost:5000`
- `access_token`: (will be set automatically)
- `refresh_token`: (will be set automatically)

### 3. Auto-Set Tokens

In the "Tests" tab of Login request, add:
```javascript
pm.environment.set("access_token", pm.response.json().data.accessToken);
```

### 4. Use Token in Requests

In protected endpoints, add header:
- Key: `Authorization`
- Value: `Bearer {{access_token}}`

---

## Common Error Responses

### 400 - Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 409 - Conflict
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### 429 - Too Many Requests
```json
{
  "success": false,
  "message": "Too many login attempts, please try again later"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting

Auth endpoints have rate limiting:
- **Auth endpoints** (login, register, forgot-password): 5 requests per 15 minutes
- **General API**: 100 requests per 15 minutes

---

## Testing Flow

### Complete Registration & Login Flow

1. **Register:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"Test123!","firstName":"Test","lastName":"User"}'
   ```

2. **Save Access Token:**
   Copy the `accessToken` from response

3. **Get Current User:**
   ```bash
   curl -X GET http://localhost:5000/api/auth/me \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **Logout:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/logout \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

5. **Login Again:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"Test123!"}'
   ```

---

## Health Check

Check if API is running:

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-11-06T...",
  "uptime": 123.456,
  "environment": "development"
}
```

---

## Database Verification

After registration, check MongoDB:

```bash
mongosh

use sales-captain

# Check users
db.users.find().pretty()

# Check companies
db.companies.find().pretty()
```

---

## Troubleshooting

### Connection Refused
- Check if server is running: `npm run dev`
- Verify port 5000 is not in use

### MongoDB Connection Error
- Start MongoDB: `net start MongoDB` (Windows) or `brew services start mongodb-community` (macOS)
- Check connection string in `.env`

### JWT Error
- Ensure `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are set in `.env`

### Redis Error (Optional)
- Redis is optional for token storage
- Start Redis: `redis-server`
- Or disable Redis usage temporarily

---

**Happy Testing!** 🚀
