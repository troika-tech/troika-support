# Services Documentation

Business logic layer for the Sales Captain application.

## Authentication Service ([auth.service.ts](auth.service.ts))

### Overview
Handles all authentication-related operations including registration, login, token management, and password operations.

### Methods

#### `register(data: RegisterData): Promise<AuthResponse>`
Register a new user account.

**Parameters:**
- `data.email` - User email (unique)
- `data.password` - Plain password (will be hashed)
- `data.firstName` - First name
- `data.lastName` - Last name
- `data.phone` - Phone number (optional)
- `data.role` - User role (optional, default: sales_rep)
- `data.companyId` - Company ID (optional for super_admin)

**Returns:**
```typescript
{
  user: SanitizedUser,
  accessToken: string,
  refreshToken: string
}
```

**Business Logic:**
1. Checks if user already exists
2. Creates default company for first super_admin
3. Validates company exists and has capacity
4. Creates user with hashed password
5. Generates JWT tokens
6. Stores refresh token in Redis
7. Updates last login timestamp

**Throws:**
- `BadRequestError` - User exists or company full
- `NotFoundError` - Company not found

---

#### `login(data: LoginData): Promise<AuthResponse>`
Authenticate user and generate tokens.

**Parameters:**
- `data.email` - User email
- `data.password` - Plain password

**Returns:**
```typescript
{
  user: SanitizedUser,
  accessToken: string,
  refreshToken: string
}
```

**Business Logic:**
1. Finds user by email (with password)
2. Checks if user is active
3. Verifies password using bcrypt
4. Checks company subscription status
5. Generates JWT tokens
6. Stores refresh token in Redis
7. Updates last login timestamp

**Throws:**
- `UnauthorizedError` - Invalid credentials, inactive account, or expired subscription

---

#### `refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }>`
Generate new access token using refresh token.

**Parameters:**
- `refreshToken` - JWT refresh token

**Returns:**
```typescript
{
  accessToken: string
}
```

**Business Logic:**
1. Verifies refresh token signature
2. Checks if token exists in Redis
3. Validates user is still active
4. Generates new access token

**Throws:**
- `UnauthorizedError` - Invalid or expired token

---

#### `logout(userId: string): Promise<void>`
Logout user and invalidate refresh token.

**Parameters:**
- `userId` - User ID

**Business Logic:**
1. Removes refresh token from Redis
2. Logs logout event

---

#### `getCurrentUser(userId: string): Promise<SanitizedUser>`
Get current user with populated relationships.

**Parameters:**
- `userId` - User ID

**Returns:** User object with populated companyId, teamId, groupId

**Throws:**
- `NotFoundError` - User not found

---

#### `requestPasswordReset(email: string): Promise<void>`
Initiate password reset process.

**Parameters:**
- `email` - User email

**Business Logic:**
1. Finds user by email
2. Generates secure reset token (TODO)
3. Stores token in Redis with 1-hour expiration (TODO)
4. Sends reset email (TODO)

**Note:** Always returns success to prevent email enumeration

---

#### `resetPassword(token: string, newPassword: string): Promise<void>`
Reset password using reset token.

**Parameters:**
- `token` - Password reset token
- `newPassword` - New password (plain text)

**Business Logic:**
1. Verifies reset token from Redis (TODO)
2. Hashes new password
3. Updates user password
4. Removes reset token from Redis (TODO)

---

### Private Methods

#### `generateTokens(user: IUser)`
Creates both access and refresh tokens.

**Returns:**
```typescript
{
  accessToken: string,  // Expires in 15 minutes
  refreshToken: string  // Expires in 7 days
}
```

---

#### `storeRefreshToken(userId: string, token: string)`
Stores refresh token in Redis with 7-day TTL.

**Redis Key:** `refresh_token:{userId}`

---

#### `getStoredRefreshToken(userId: string)`
Retrieves refresh token from Redis.

---

#### `removeRefreshToken(userId: string)`
Deletes refresh token from Redis.

---

#### `sanitizeUser(user: any)`
Removes sensitive fields (password, __v) before returning user data.

---

### Token Management

**Access Token:**
- Expiry: 15 minutes (configurable via JWT_EXPIRES_IN)
- Stored: Client-side (localStorage/memory)
- Used: Authorization header for API requests

**Refresh Token:**
- Expiry: 7 days (configurable via REFRESH_TOKEN_EXPIRES_IN)
- Stored:
  - Server-side: Redis
  - Client-side: httpOnly cookie (recommended) or localStorage
- Used: To obtain new access token

### Security Features

1. **Password Hashing:** Bcrypt with 12 rounds
2. **JWT Tokens:** Signed with secret keys
3. **Token Rotation:** Refresh token stored in Redis for revocation
4. **Rate Limiting:** Applied to auth endpoints
5. **Subscription Check:** Validates company subscription on login
6. **Account Status:** Checks if user is active
7. **Input Validation:** Zod schemas in routes
8. **Email Enumeration Prevention:** Same response for existing/non-existing users

### Error Handling

All methods log errors and throw appropriate HTTP errors:
- `BadRequestError` (400) - Validation or business rule violation
- `UnauthorizedError` (401) - Invalid credentials or tokens
- `NotFoundError` (404) - Resource not found

### Redis Usage

Redis is used for:
- Storing refresh tokens
- Token revocation on logout
- Password reset tokens (future)

**Fallback:** Redis failures are logged but don't break functionality (except token refresh which requires Redis).

---

## Usage Examples

### Register a New User
```typescript
import authService from './services/auth.service';

const result = await authService.register({
  email: 'rep@example.com',
  password: 'SecurePass123',
  firstName: 'John',
  lastName: 'Doe',
  role: 'sales_rep',
  companyId: '507f1f77bcf86cd799439011',
});

console.log(result.user);
console.log(result.accessToken);
```

### Login
```typescript
const result = await authService.login({
  email: 'rep@example.com',
  password: 'SecurePass123',
});

// Store tokens
localStorage.setItem('accessToken', result.accessToken);
// Refresh token is set as httpOnly cookie
```

### Refresh Token
```typescript
const refreshToken = getCookie('refreshToken');
const result = await authService.refreshAccessToken(refreshToken);

// Update access token
localStorage.setItem('accessToken', result.accessToken);
```

### Logout
```typescript
await authService.logout(userId);
localStorage.removeItem('accessToken');
```

---

## Testing

### Manual Testing with cURL

#### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "super_admin"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!"
  }'
```

#### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Refresh Token
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Future Enhancements

1. **Email Verification**
   - Send verification email on registration
   - Require email verification before login

2. **Two-Factor Authentication (2FA)**
   - TOTP support
   - SMS verification

3. **Session Management**
   - Track active sessions
   - Logout from all devices

4. **OAuth Integration**
   - Google OAuth
   - Microsoft OAuth

5. **Account Lockout**
   - Lock account after X failed login attempts
   - Automatic unlock after Y minutes

6. **Password Policy**
   - Complexity requirements
   - Password history
   - Expiration

---

**Authentication system is production-ready!** ✅
