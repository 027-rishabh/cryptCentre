# Cryptocurrency Trading Platform

A high-performance, production-ready cryptocurrency trading platform with automated market making capabilities, supporting multiple exchanges including BingX, BitMart, AscendX, Gate.io, and MEXC.

## Features

- **Multi-Exchange Support**: Seamlessly trade across BingX, BitMart, AscendX, Gate.io, and MEXC
- **Automated Market Making**: Advanced market making bot with configurable spread and order placement
- **Real-time Price Feeds**: WebSocket connections for live price updates from both CEX and DEX sources
- **Order Management**: Comprehensive order placement, tracking, and history
- **API Key Management**: Secure storage and management of exchange API credentials
- **Modern UI**: Clean, responsive React interface with Material-UI components
- **High Performance**: C++ backend with Drogon framework for low-latency trading
- **ACID Compliant Database**: SQLite with full transaction support

## Technology Stack

### Backend
- **Framework**: Drogon (Modern C++ Web Framework)
- **Language**: C++17
- **Database**: SQLite3 with ACID compliance
- **Authentication**: JWT tokens with bcrypt password hashing
- **Encryption**: AES-256 for API key storage
- **WebSocket**: Native WebSocket support for real-time updates

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: Zustand
- **Charts**: Recharts
- **Build Tool**: Vite
- **API Client**: Axios
- **WebSocket Client**: Socket.io-client

## Project Structure

```
crypto-trading-platform/
├── backend/
│   ├── src/
│   │   ├── main.cpp           # Application entry point
│   │   ├── server/            # Web server and routing
│   │   ├── api/               # Exchange API integrations
│   │   ├── websocket/         # WebSocket handlers
│   │   ├── database/          # Database layer
│   │   ├── trading/           # Trading logic and market making
│   │   ├── controllers/       # HTTP request handlers
│   │   └── utils/             # Utilities (crypto, logging, config)
│   ├── include/               # Header files
│   ├── config/               # Configuration files
│   ├── tests/                # Unit and integration tests
│   └── CMakeLists.txt        # Build configuration
└── frontend/
    ├── src/
    │   ├── components/       # React components
    │   ├── pages/           # Page components
    │   ├── services/        # API services
    │   ├── hooks/           # Custom React hooks
    │   ├── stores/          # State management
    │   └── utils/           # Utility functions
    └── package.json         # Node.js dependencies
```

## Prerequisites

### Backend Requirements
- **C++ Compiler**: GCC 9+, Clang 10+, or MSVC 2019+
- **CMake**: Version 3.16 or higher
- **Libraries**:
  - Drogon framework
  - OpenSSL
  - SQLite3
  - libcurl
  - JsonCpp
  - UUID library

### Frontend Requirements
- **Node.js**: Version 18+
- **npm**: Version 9+

## Installation

### 1. Install Backend Dependencies

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    libsqlite3-dev \
    libcurl4-openssl-dev \
    libjsoncpp-dev \
    uuid-dev \
    zlib1g-dev

# Install Drogon
git clone https://github.com/drogonframework/drogon
cd drogon
git submodule update --init
mkdir build
cd build
cmake ..
make && sudo make install
```

#### macOS
```bash
brew install cmake openssl sqlite curl jsoncpp ossp-uuid

# Install Drogon
git clone https://github.com/drogonframework/drogon
cd drogon
git submodule update --init
mkdir build
cd build
cmake ..
make && sudo make install
```

### 2. Build Backend

```bash
cd crypto-trading-platform/backend
mkdir build
cd build
cmake ..
make -j$(nproc)
```

### 3. Setup Frontend

```bash
cd crypto-trading-platform/frontend
npm install
```

## Configuration

### Backend Configuration

Edit `backend/config/config.json`:

```json
{
    "server": {
        "port": 8080,
        "threads": 16
    },
    "database": {
        "path": "trading.db"
    },
    "security": {
        "jwt_secret": "YOUR_SECRET_KEY",
        "aes_key": "YOUR_ENCRYPTION_KEY"
    },
    "cors": {
        "origin": "http://localhost:3000"
    }
}
```

### Frontend Configuration

Create `.env` file in frontend directory:

```env
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
```

## Running the Application

### Start Backend Server

```bash
cd crypto-trading-platform/backend/build
./CryptoTradingPlatform
```

The backend will start on `http://localhost:8080`

### Start Frontend Development Server

```bash
cd crypto-trading-platform/frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

## Production Build

### Backend
```bash
cd backend/build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
```

### Frontend
```bash
cd frontend
npm run build
```

The production files will be in `frontend/dist/`

## API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Trading Endpoints

- `GET /api/v1/trading/pairs` - Get available trading pairs
- `GET /api/v1/trading/balances` - Get account balances
- `POST /api/v1/orders/create` - Place new order
- `POST /api/v1/orders/cancel` - Cancel order
- `GET /api/v1/orders/history` - Get order history
- `GET /api/v1/orders/open` - Get open orders

### Market Making

- `POST /api/v1/market-making/start` - Start market making session
- `POST /api/v1/market-making/stop` - Stop market making session
- `GET /api/v1/market-making/sessions` - Get active sessions

### WebSocket Endpoints

- `/ws/v1/prices` - Real-time price updates
- `/ws/v1/orders` - Order status updates
- `/ws/v1/notifications` - System notifications

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **API Key Encryption**: AES-256 encryption for stored API keys
- **Rate Limiting**: Configurable per-user and per-IP limits
- **HTTPS Support**: SSL/TLS encryption for production
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin access

## Testing

### Backend Tests
```bash
cd backend/build
ctest --verbose
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Docker Support

### Build Docker Image
```bash
docker build -t crypto-trading-platform .
```

### Run with Docker Compose
```bash
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Database Lock Error**
   - Solution: Ensure only one instance is running
   - Check file permissions on trading.db

2. **WebSocket Connection Failed**
   - Check firewall settings
   - Verify CORS configuration

3. **API Key Invalid**
   - Ensure keys are properly encrypted
   - Check exchange API permissions

4. **Build Errors**
   - Verify all dependencies are installed
   - Check compiler version compatibility

## Performance Optimization

- **Database**: Uses WAL mode for better concurrency
- **Connection Pooling**: Reuses database and HTTP connections
- **Async Operations**: Non-blocking I/O for all network operations
- **Memory Management**: Smart pointers and RAII patterns
- **Frontend**: Virtual scrolling and memoization for large datasets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team

## Disclaimer

This software is for educational and legitimate trading purposes only. Users are responsible for compliance with local regulations and exchange terms of service.

---

**Note**: Always test with small amounts first and never share your API keys or credentials.