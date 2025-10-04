# Alchemy Frontend

This repository contains the frontend React application for the Alchemy game.

## Architecture

This frontend connects to a separate backend API running on a different server:
- **Backend API**: `https://see-recover.gl.at.ply.gg/api` (Bilbo PC)
- **Frontend**: Runs independently on any PC with playit tunnel

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- playit tunnel software

### Installation
```bash
git clone git@github.com:ablepacifist/Lexicon.git
cd Lexicon
npm install
```

### Configuration
1. Copy environment template:
   ```bash
   cp .env.newpc .env
   ```

2. Setup your playit tunnel:
   ```bash
   playit tunnel tcp 3001
   ```

3. Update `.env` with your tunnel URL:
   ```env
   REACT_APP_API_URL=https://see-recover.gl.at.ply.gg/api
   PORT=3001
   REACT_APP_FRONTEND_URL=https://your-tunnel-url.ply.gg
   ```

4. Update backend CORS settings (on Bilbo PC) to include your tunnel URL

### Run Application
```bash
npm start
```

The app will start on port 3001 and be accessible via your playit tunnel.

## Backend Connection

This frontend communicates with the Alchemy backend API. The backend must be running and accessible at the URL specified in `REACT_APP_API_URL`.

**Backend Repository**: [alchemyServer](https://github.com/ablepacifist/alchemyServer)

## Environment Variables

- `REACT_APP_API_URL`: Backend API base URL
- `PORT`: Port for the React development server (default: 3001)
- `REACT_APP_ENV`: Environment (development/production)
- `REACT_APP_FRONTEND_URL`: Your frontend tunnel URL (for reference)

## Deployment

1. Ensure backend is running and accessible
2. Configure environment variables
3. Setup playit tunnel
4. Start the application

The frontend will be accessible via your playit tunnel URL.

## Troubleshooting

### CORS Errors
- Verify your tunnel URL is added to backend CORS configuration
- Check both http:// and https:// variants
- Restart backend after CORS changes

### API Connection Issues
- Verify `REACT_APP_API_URL` is correct
- Test backend endpoint directly
- Check network connectivity

### Tunnel Issues
- Ensure playit tunnel is running
- Verify port 3001 is accessible
- Check firewall settings

## Game Features

- Player authentication and registration
- Inventory management
- Potion brewing system
- Ingredient foraging
- Knowledge book
- Player progression

## Tech Stack

- React 19.1.0
- React Router 7.6.1
- Modern JavaScript (ES6+)
- CSS3 with animations
- Fetch API for backend communication

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
