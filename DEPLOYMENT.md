# Frontend Deployment Guide

## Moving Frontend to New PC

This guide helps you deploy the Alchemy frontend to a new PC while keeping the backend on Bilbo PC.

### Step 1: Clone Frontend Repository
```bash
git clone git@github.com:ablepacifist/Lexicon.git
cd Lexicon
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Setup Environment
```bash
# Copy the environment template
cp .env.newpc .env

# Edit .env file to match your setup
nano .env
```

### Step 4: Configure playit Tunnel
```bash
# Install playit if not already installed
# Setup tunnel for port 3001
playit tunnel tcp 3001

# Note your tunnel URL (e.g., "your-tunnel.ply.gg")
```

### Step 5: Update Backend CORS (on Bilbo PC)
Add your new tunnel URL to the backend CORS configuration in these files:
- `src/main/java/alchemy/api/AuthController.java`
- `src/main/java/alchemy/api/PlayerController.java`

Add your tunnel URL to the origins array:
```java
@CrossOrigin(origins = {
    "http://localhost:3000", "http://localhost:3001", 
    "http://127.0.0.1:3000", "http://127.0.0.1:3001",
    "https://see-recover.gl.at.ply.gg", 
    "http://see-recover.gl.at.ply.gg",
    "https://your-tunnel.ply.gg",  // <- Add your tunnel URL
    "http://your-tunnel.ply.gg"    // <- Add your tunnel URL
}, allowCredentials = "true")
```

### Step 6: Update .env File
```env
REACT_APP_API_URL=https://see-recover.gl.at.ply.gg/api
PORT=3001
REACT_APP_ENV=production
REACT_APP_FRONTEND_URL=https://your-tunnel.ply.gg
```

### Step 7: Start Frontend
```bash
npm start
```

## Verification

1. Frontend starts on port 3001
2. playit tunnel exposes it publicly
3. No CORS errors in browser console
4. Can login and access all features
5. API calls work through backend tunnel

## Architecture After Deployment

```
[New PC - Frontend] → [playit tunnel] → [Internet] → [Bilbo PC tunnel] → [Bilbo PC - Backend]
     ↓                                                                           ↓
  React App                                                               Spring Boot API
  Port 3001                                                                Port 36567
```

Both services run independently and communicate through secure tunnels.