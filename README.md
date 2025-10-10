# Crypto Trading Platform

A full-stack cryptocurrency trading platform with automated market making capabilities. Built with React, Node.js, Express, and CCXT for multi-exchange support.

## Features

- **Multi-Exchange Support**: Trade on BingX, BitMart, AscendX, Gate.io, and MEXC
- **Real-time Market Data**: Live price feeds and order book data
- **Limit Order Trading**: Place buy/sell orders with real-time execution
- **Automated Market Making**: Cluster-based market making strategy with configurable spread
- **Session Persistence**: Auto-resume active market making sessions on server restart
- **Graceful Shutdown**: Properly stops all bots and cancels orders on server shutdown
- **Session Management**: Delete market making sessions with full cleanup
- **Secure API Key Management**: Encrypted storage of exchange API credentials
- **Real-time Updates**: WebSocket integration for live price updates
- **User Authentication**: Secure JWT-based authentication system
- **Order Management**: Track open orders, order history, and balances

## Architecture

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for modern UI components
- **Vite** for fast development and building
- **Axios** for API communication

### Backend
- **Node.js** with Express
- **SQLite** database for data persistence
- **CCXT** library for exchange integration
- **JWT** for authentication
- **bcrypt** for password hashing
- **WebSocket** for real-time updates

### Market Making Strategy
- **Cluster-based approach**: Places 1 buy + 1 sell order as a paired unit
- **Reference price source**: CEX or DEX price
- **Same-price replacement**: Refills at the same price when orders are filled
- **Configurable spread**: Customize spread percentage from mid price
- **Fill detection**: Every 5 seconds check for filled orders
- **Price monitoring**: Refresh orders on significant price movement
- **Auto-resume**: Automatically restarts active sessions on server restart
- **Graceful shutdown**: Cleanly stops all bots and cancels orders on server shutdown

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- Exchange API keys (for trading functionality)

## Local Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/crypto-trading-platform.git
cd crypto-trading-platform
```

### 2. Install Backend Dependencies

```bash
cd backend-node
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure Environment (Optional)

Create a `.env` file in the `backend-node` directory:

```env
PORT=8080
JWT_SECRET=your-secret-key-change-in-production
```

### 5. Run the Backend

```bash
cd backend-node
node server.js
```

The backend will start on `http://localhost:8080`

### 6. Run the Frontend (in a new terminal)

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### 7. Access the Application

Open your browser and navigate to: `http://localhost:5173`

## VPS Deployment

### Prerequisites
- Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- Domain name (optional, for HTTPS)

### 1. Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install -y nginx

# Install Certbot for SSL (optional)
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Clone and Setup Application

```bash
# Create application directory
cd /var/www
sudo git clone https://github.com/yourusername/crypto-trading-platform.git
cd crypto-trading-platform

# Set permissions
sudo chown -R $USER:$USER /var/www/crypto-trading-platform
```

### 3. Install Dependencies

```bash
# Backend
cd backend-node
npm install --production

# Frontend
cd ../frontend
npm install
npm run build
```

### 4. Configure Environment

```bash
cd /var/www/crypto-trading-platform/backend-node
nano .env
```

Add:
```env
PORT=8080
JWT_SECRET=<generate-strong-random-key>
NODE_ENV=production
```

### 5. Start Backend with PM2

```bash
cd /var/www/crypto-trading-platform/backend-node

# Start the backend
pm2 start server.js --name crypto-backend

# Save PM2 configuration
pm2 save

# Enable PM2 to start on boot
pm2 startup
```

### 6. Configure Nginx (Reverse Proxy)

```bash
sudo nano /etc/nginx/sites-available/crypto-trading
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/crypto-trading-platform/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/crypto-trading /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Setup SSL with Let's Encrypt (Optional)

```bash
sudo certbot --nginx -d your-domain.com
```

### 8. Update Frontend API URL

Edit `/var/www/crypto-trading-platform/frontend/src/AppComplete.tsx` and replace all instances of `http://localhost:8080` with your production API URL:

```bash
cd /var/www/crypto-trading-platform/frontend
# Use sed to replace localhost URLs
find src -type f -name "*.tsx" -exec sed -i 's|http://localhost:8080|https://your-domain.com|g' {} +

# Rebuild frontend
npm run build
```

### 9. Firewall Configuration

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 10. Monitor Application

```bash
# View backend logs
pm2 logs crypto-backend

# Check backend status
pm2 status

# Monitor resources
pm2 monit

# Restart backend
pm2 restart crypto-backend
```

### 11. Session Persistence on VPS

The platform automatically resumes active market making sessions when the server restarts:

- **Automatic Resume**: On startup, the server queries the database for sessions with status 'running' or 'starting' and automatically restarts them
- **Graceful Shutdown**: When stopping the server with `pm2 stop` or `pm2 restart`, all active bots cleanly stop and cancel their orders
- **Crash Recovery**: If the server crashes unexpectedly, active sessions will be automatically resumed on the next startup

```bash
# Safely restart the backend (sessions will be preserved)
pm2 restart crypto-backend

# View session resume logs
pm2 logs crypto-backend | grep -i "resume"
```

## Using the Platform

### 1. Register an Account

1. Click "Register" button
2. Enter username, email, and password
3. You'll be automatically logged in

### 2. Add Exchange API Keys

#### For Trading:
1. Click the **key icon** in the top navigation
2. Select your exchange
3. Enter API Key and Secret
4. Save

#### For Market Making:
1. Go to **Market Making** tab
2. Click **MM API Keys** button
3. Add separate API keys for market making

### 3. Place Manual Orders

1. Select exchange and trading pair
2. Go to **Limit Orders** tab
3. Choose Buy or Sell
4. Enter price and amount
5. Click "Place Order"

### 4. Start Market Making

1. Go to **Market Making** tab
2. Configure:
   - **Spread Percentage**: Distance from mid price (e.g., 0.5%)
   - **Total Amount**: Capital to deploy in USDT (split 50/50)
   - **Reference Source**: CEX or DEX price
3. Click "Start Market Making"
4. Monitor active sessions

### 5. Manage Market Making Sessions

1. View all sessions in the **Market Making** tab
2. **Stop** an active session using the stop button
3. **Delete** a session (stopped or active) using the delete button
4. Sessions are automatically resumed if server restarts while they're active

## Market Making Configuration

### Spread Percentage
- **0.1% - 0.5%**: Tight spread for high liquidity pairs
- **0.5% - 2%**: Medium spread for moderate liquidity
- **2% - 10%**: Wide spread for low liquidity pairs

### Total Amount
- Minimum: $10 USDT
- Recommended: $100+ for meaningful market making
- Split 50/50 between buy and sell orders

### Reference Source
- **CEX Price**: Use exchange mid price (bid + ask) / 2
- **DEX Price**: Use DexScreener price (for specific pairs)

## Security Best Practices

### API Keys
- **Read-Only**: Not supported (trading requires write access)
- **IP Whitelist**: Enable on exchange if available
- **Separate Keys**: Use different keys for trading vs market making
- **Withdraw Disabled**: Disable withdraw permissions on exchange

### Password
- Use strong, unique passwords
- Change default JWT secret in production
- Enable 2FA on exchange accounts

### VPS Security
- Use SSH keys instead of passwords
- Keep system packages updated
- Use firewall (UFW)
- Regular backups of SQLite database

## Database

The platform uses SQLite for data persistence. Database file: `backend-node/trading.db`

### Backup Database

```bash
# Local backup
cp backend-node/trading.db backend-node/trading.db.backup

# VPS backup
cd /var/www/crypto-trading-platform/backend-node
sudo cp trading.db /backup/trading.db.$(date +%Y%m%d_%H%M%S)
```

## Troubleshooting

### Backend won't start
```bash
# Check if port 8080 is in use
sudo lsof -i :8080

# Check logs
cd backend-node
npm start
```

### Frontend build errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Exchange API errors
- Verify API keys are correct
- Check API key permissions (spot trading enabled)
- Ensure IP whitelist includes your server IP
- Check exchange API rate limits

### Market Making not starting
- Verify MM API keys are configured for selected exchange
- Check sufficient balance for total amount
- Ensure trading pair is available on exchange
- Review backend logs: `pm2 logs crypto-backend`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/user/profile` - Get user profile

### Trading
- `GET /api/v1/market/ticker` - Get ticker data
- `GET /api/v1/market/orderbook` - Get order book
- `POST /api/v1/orders/create` - Create order
- `GET /api/v1/orders/open` - Get open orders
- `GET /api/v1/orders/history` - Get order history
- `DELETE /api/v1/orders/:orderId` - Cancel order
- `GET /api/v1/trading/balances` - Get balances

### Market Making
- `POST /api/v1/market-making/start` - Start MM session
- `POST /api/v1/market-making/stop` - Stop MM session
- `DELETE /api/v1/market-making/sessions/:sessionId` - Delete MM session
- `GET /api/v1/market-making/sessions` - Get all sessions
- `GET /api/v1/market-making/sessions/:sessionId` - Get session details

### API Keys Management
- `POST /api/v1/user/api-keys` - Add API key
- `GET /api/v1/user/api-keys` - List API keys
- `DELETE /api/v1/user/api-keys/:exchange` - Delete API key
- `POST /api/v1/mm/api-keys` - Add MM API key
- `GET /api/v1/mm/api-keys` - List MM API keys
- `DELETE /api/v1/mm/api-keys/:exchange` - Delete MM API key

## Supported Exchanges

| Exchange | Spot Trading | Market Making | API Memo Required |
|----------|-------------|---------------|-------------------|
| BingX    | ✅ | ✅ | No |
| BitMart  | ✅ | ✅ | Yes (Memo) |
| AscendX  | ✅ | ✅ | No |
| Gate.io  | ✅ | ✅ | No |
| MEXC     | ✅ | ✅ | No |

## Performance

### Market Making
- **Fill Detection**: 5 seconds
- **Price Refresh**: 2 minutes (CEX) / Event-driven (DEX)
- **Order Placement**: ~100ms per order
- **Database Writes**: Asynchronous (non-blocking)

### Recommended VPS Specs
- **Minimal**: 1 CPU, 1GB RAM, 10GB SSD
- **Recommended**: 2 CPU, 2GB RAM, 20GB SSD
- **High Volume**: 4 CPU, 4GB RAM, 40GB SSD

## Development

### Project Structure
```
crypto-trading-platform/
├── backend-node/
│   ├── server.js                 # Main backend server
│   ├── marketMakingBot.js        # Cluster-based MM bot
│   ├── exchangeConnector.js      # CCXT integration
│   ├── mmApproaches/             # Alternative MM strategies
│   └── trading.db                # SQLite database
├── frontend/
│   ├── src/
│   │   ├── AppComplete.tsx       # Main React component
│   │   └── main.tsx              # React entry point
│   ├── index.html
│   └── vite.config.ts
└── README.md
```

### Running in Development Mode

```bash
# Terminal 1: Backend with auto-restart
cd backend-node
npm install -g nodemon
nodemon server.js

# Terminal 2: Frontend with hot reload
cd frontend
npm run dev
```

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Disclaimer

This software is for educational purposes only. Trading cryptocurrencies carries risk. Only trade with funds you can afford to lose. The developers are not responsible for any financial losses incurred while using this platform.

## Version

Current Version: 1.0.0
Last Updated: October 2025