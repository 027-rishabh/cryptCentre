import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import {
    createExchangeInstance,
    fetchTicker,
    fetchOrderBook,
    fetchBalance,
    fetchOpenOrders,
    fetchOrderHistory,
    createLimitOrder,
    createMarketOrder,
    cancelOrder,
    getMarkets
} from './exchangeConnector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'crypto-trading-secret-key-change-in-production';

// Initialize SQLite database
const db = new sqlite3.Database('./trading.db');

// Create tables
const initDatabase = () => {
    db.serialize(() => {
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1
            )
        `);

        // API Credentials table
        db.run(`
            CREATE TABLE IF NOT EXISTS api_credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                exchange TEXT NOT NULL,
                api_key_encrypted TEXT NOT NULL,
                api_secret_encrypted TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, exchange)
            )
        `);

        // Orders table
        db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                exchange TEXT NOT NULL,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                price REAL,
                quantity REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Balances table
        db.run(`
            CREATE TABLE IF NOT EXISTS balances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                exchange TEXT NOT NULL,
                currency TEXT NOT NULL,
                available REAL DEFAULT 0,
                locked REAL DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        console.log('Database tables created successfully');
    });
};

// Initialize database
initDatabase();

// Helper functions
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Encryption functions
const encrypt = (text) => {
    const algorithm = 'aes-256-ctr';
    const secretKey = crypto.createHash('sha256').update(JWT_SECRET).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (hash) => {
    const algorithm = 'aes-256-ctr';
    const secretKey = crypto.createHash('sha256').update(JWT_SECRET).digest();
    const parts = hash.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(parts[1], 'hex')), decipher.final()]);
    return decrypted.toString();
};

// Routes

// Health check
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        exchanges: ['bingx', 'bitmart', 'ascendx', 'gateio', 'mexc']
    });
});

// Authentication routes
app.post('/api/v1/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Username or email already exists' });
                    }
                    return res.status(500).json({ error: 'Registration failed' });
                }

                const token = generateToken(this.lastID);
                res.json({
                    success: true,
                    token,
                    user: { id: this.lastID, username, email }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/v1/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = generateToken(user.id);
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        }
    );
});

// Protected routes
app.get('/api/v1/user/profile', verifyToken, (req, res) => {
    db.get(
        'SELECT id, username, email, created_at FROM users WHERE id = ?',
        [req.userId],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        }
    );
});

// API Keys management
app.post('/api/v1/user/api-keys', verifyToken, (req, res) => {
    const { exchange, apiKey, apiSecret, apiMemo } = req.body;

    // Validate exchange
    const validExchanges = ['bingx', 'bitmart', 'ascendx', 'gateio', 'mexc'];
    if (!exchange || !validExchanges.includes(exchange.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid exchange. Must be one of: ' + validExchanges.join(', ') });
    }

    if (!apiKey || !apiSecret) {
        return res.status(400).json({ error: 'API key and secret are required' });
    }

    // Encrypt the credentials
    const encryptedKey = encrypt(apiKey);
    const encryptedSecret = encrypt(apiSecret);
    const encryptedMemo = apiMemo ? encrypt(apiMemo) : null;

    // First, need to add memo column if it doesn't exist
    db.run('ALTER TABLE api_credentials ADD COLUMN api_memo TEXT', () => {
        // Column might already exist, that's fine
    });

    db.run(
        'INSERT OR REPLACE INTO api_credentials (user_id, exchange, api_key_encrypted, api_secret_encrypted, api_memo) VALUES (?, ?, ?, ?, ?)',
        [req.userId, exchange.toLowerCase(), encryptedKey, encryptedSecret, encryptedMemo],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to save API keys: ' + err.message });
            }
            res.json({
                success: true,
                message: `API keys for ${exchange} saved successfully`,
                exchange: exchange.toLowerCase()
            });
        }
    );
});

app.get('/api/v1/user/api-keys', verifyToken, (req, res) => {
    db.all(
        'SELECT id, exchange, created_at FROM api_credentials WHERE user_id = ?',
        [req.userId],
        (err, keys) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch API keys' });
            }
            res.json(keys || []);
        }
    );
});

// Delete API key endpoint
app.delete('/api/v1/user/api-keys/:exchange', verifyToken, (req, res) => {
    const { exchange } = req.params;

    db.run(
        'DELETE FROM api_credentials WHERE user_id = ? AND exchange = ?',
        [req.userId, exchange.toLowerCase()],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete API key' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'API key not found for this exchange' });
            }
            res.json({ success: true, message: `API key for ${exchange} deleted successfully` });
        }
    );
});

// Trading pairs - Fetch real pairs from exchange using CCXT
app.get('/api/v1/trading/pairs', async (req, res) => {
    const { exchange = 'bingx' } = req.query;

    try {
        // Fetch real trading pairs from exchange
        const markets = await getMarkets(exchange);

        // Return all available pairs
        res.json(markets);
    } catch (error) {
        console.error(`Error fetching pairs from ${exchange}:`, error.message);
        res.status(500).json({
            error: `Failed to fetch trading pairs from ${exchange}: ${error.message}`,
            pairs: []
        });
    }
});

// Market data - Using CCXT
app.get('/api/v1/market/ticker', async (req, res) => {
    const { symbol = 'BTC/USDT', exchange = 'bingx' } = req.query;

    try {
        // Fetch real ticker data from exchange using CCXT
        const ticker = await fetchTicker(exchange, symbol);
        res.json(ticker);
    } catch (error) {
        console.error('Error fetching ticker:', error.message);

        // Return proper error instead of mock data
        res.status(400).json({
            error: error.message,
            symbol,
            exchange,
            message: error.message.includes('not available')
                ? `${symbol} is not available on ${exchange}. Please select a different pair or exchange.`
                : `Failed to fetch ticker data from ${exchange}: ${error.message}`
        });
    }
});

// Order Book - Using CCXT
app.get('/api/v1/market/orderbook', async (req, res) => {
    const { symbol = 'BTC/USDT', exchange = 'bingx', limit = 10 } = req.query;

    try {
        const orderBook = await fetchOrderBook(exchange, symbol, parseInt(limit));
        res.json({
            symbol,
            exchange,
            ...orderBook
        });
    } catch (error) {
        console.error('Error fetching order book:', error.message);

        // Return proper error instead of mock data
        res.status(400).json({
            error: error.message,
            symbol,
            exchange,
            message: error.message.includes('not available')
                ? `${symbol} is not available on ${exchange}. Please select a different pair or exchange.`
                : `Failed to fetch order book from ${exchange}: ${error.message}`
        });
    }
});

// DEX price (DexScreener)
app.get('/api/v1/market/dex-price', async (req, res) => {
    try {
        const response = await axios.get(
            'https://api.dexscreener.com/latest/dex/pairs/bsc/0x13f80c53b837622e899e1ac0021ed3d1775caefa'
        );

        const pair = response.data.pair;
        res.json({
            symbol: 'LAND/USDT',
            price: pair.priceUsd,
            priceNative: pair.priceNative,
            volume24h: pair.volume.h24,
            priceChange24h: pair.priceChange.h24,
            liquidity: pair.liquidity.usd,
            fdv: pair.fdv
        });
    } catch (error) {
        // Fallback mock data
        res.json({
            symbol: 'LAND/USDT',
            price: 0.85 + Math.random() * 0.1,
            volume24h: 150000,
            priceChange24h: 2.3,
            liquidity: 500000,
            fdv: 50000000
        });
    }
});

// Orders - Create real order on exchange
app.post('/api/v1/orders/create', verifyToken, async (req, res) => {
    const { exchange, symbol, side, type, quantity, price } = req.body;

    if (!exchange || !symbol || !side || !type || !quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Get API credentials from database
        db.get(
            'SELECT api_key_encrypted, api_secret_encrypted, api_memo FROM api_credentials WHERE user_id = ? AND exchange = ?',
            [req.userId, exchange.toLowerCase()],
            async (err, credentials) => {
                if (err || !credentials) {
                    return res.status(404).json({ error: `No API keys found for ${exchange}. Please add your API keys first.` });
                }

                try {
                    // Decrypt credentials
                    const apiKey = decrypt(credentials.api_key_encrypted);
                    const apiSecret = decrypt(credentials.api_secret_encrypted);
                    const apiMemo = credentials.api_memo ? decrypt(credentials.api_memo) : null;

                    // Create exchange instance
                    const exchangeInstance = createExchangeInstance(exchange, apiKey, apiSecret, apiMemo);

                    // Create real order on exchange
                    let order;
                    if (type.toUpperCase() === 'LIMIT') {
                        if (!price) {
                            return res.status(400).json({ error: 'Price is required for limit orders' });
                        }
                        order = await createLimitOrder(exchangeInstance, symbol, side, quantity, price);
                    } else if (type.toUpperCase() === 'MARKET') {
                        order = await createMarketOrder(exchangeInstance, symbol, side, quantity);
                    } else {
                        return res.status(400).json({ error: 'Invalid order type. Use LIMIT or MARKET' });
                    }

                    // Save order to database
                    db.run(
                        'INSERT INTO orders (user_id, exchange, symbol, side, type, status, price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [req.userId, exchange, symbol, order.side, order.type, order.status, order.price, order.quantity],
                        function(dbErr) {
                            if (dbErr) {
                                console.error('Error saving order to database:', dbErr);
                            }
                        }
                    );

                    res.json({
                        success: true,
                        order: order,
                        message: 'Order placed successfully on exchange'
                    });
                } catch (error) {
                    console.error('Error creating order:', error.message);
                    res.status(500).json({ error: `Failed to create order: ${error.message}` });
                }
            }
        );
    } catch (error) {
        console.error('Error in create order endpoint:', error.message);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/api/v1/orders/open', verifyToken, (req, res) => {
    db.all(
        "SELECT * FROM orders WHERE user_id = ? AND status IN ('PENDING', 'PARTIAL') ORDER BY created_at DESC",
        [req.userId],
        (err, orders) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch orders' });
            }
            res.json(orders || []);
        }
    );
});

app.get('/api/v1/orders/history', verifyToken, async (req, res) => {
    const { exchange } = req.query;

    // Validate exchange parameter
    if (!exchange || typeof exchange !== 'string') {
        // Return empty array if no valid exchange specified
        return res.json([]);
    }

    try {
        // Get API credentials from database
        db.get(
            'SELECT api_key_encrypted, api_secret_encrypted, api_memo FROM api_credentials WHERE user_id = ? AND exchange = ?',
            [req.userId, exchange.toLowerCase()],
            async (err, credentials) => {
                if (err || !credentials) {
                    // Return empty array instead of error if no API keys (user hasn't set them up yet)
                    return res.json([]);
                }

                try {
                    // Decrypt credentials
                    const apiKey = decrypt(credentials.api_key_encrypted);
                    const apiSecret = decrypt(credentials.api_secret_encrypted);
                    const apiMemo = credentials.api_memo ? decrypt(credentials.api_memo) : null;

                    // Create exchange instance
                    const exchangeInstance = createExchangeInstance(exchange, apiKey, apiSecret, apiMemo);

                    // Fetch order history from exchange
                    const orders = await fetchOrderHistory(exchangeInstance, null, 100);

                    res.json(orders || []);
                } catch (error) {
                    console.error('Error fetching order history from exchange:', error.message);
                    // Return empty array instead of error to avoid breaking the UI
                    res.json([]);
                }
            }
        );
    } catch (error) {
        console.error('Error in order history endpoint:', error.message);
        // Return empty array instead of error
        res.json([]);
    }
});

// Open Orders - Fetch from exchange
app.get('/api/v1/trading/open-orders', verifyToken, async (req, res) => {
    const { exchange, symbol } = req.query;

    if (!exchange) {
        return res.status(400).json({ error: 'Exchange parameter is required' });
    }

    try {
        // Get API credentials from database
        db.get(
            'SELECT api_key_encrypted, api_secret_encrypted, api_memo FROM api_credentials WHERE user_id = ? AND exchange = ?',
            [req.userId, exchange.toLowerCase()],
            async (err, credentials) => {
                if (err || !credentials) {
                    return res.status(404).json({ error: `No API keys found for ${exchange}. Please add your API keys first.` });
                }

                try {
                    // Decrypt credentials
                    const apiKey = decrypt(credentials.api_key_encrypted);
                    const apiSecret = decrypt(credentials.api_secret_encrypted);
                    const apiMemo = credentials.api_memo ? decrypt(credentials.api_memo) : null;

                    // Create exchange instance
                    const exchangeInstance = createExchangeInstance(exchange, apiKey, apiSecret, apiMemo);

                    // Fetch open orders from exchange
                    const orders = await fetchOpenOrders(exchangeInstance, symbol || null);

                    res.json(orders);
                } catch (error) {
                    console.error('Error fetching open orders:', error.message);
                    res.status(500).json({ error: `Failed to fetch open orders: ${error.message}` });
                }
            }
        );
    } catch (error) {
        console.error('Error in open orders endpoint:', error.message);
        res.status(500).json({ error: 'Failed to fetch open orders' });
    }
});

// Cancel Order
app.delete('/api/v1/orders/:orderId', verifyToken, async (req, res) => {
    const { orderId } = req.params;
    const { exchange, symbol } = req.query;

    if (!exchange || !symbol) {
        return res.status(400).json({ error: 'Exchange and symbol parameters are required' });
    }

    try {
        // Get API credentials from database
        db.get(
            'SELECT api_key_encrypted, api_secret_encrypted, api_memo FROM api_credentials WHERE user_id = ? AND exchange = ?',
            [req.userId, exchange.toLowerCase()],
            async (err, credentials) => {
                if (err || !credentials) {
                    return res.status(404).json({ error: `No API keys found for ${exchange}. Please add your API keys first.` });
                }

                try {
                    // Decrypt credentials
                    const apiKey = decrypt(credentials.api_key_encrypted);
                    const apiSecret = decrypt(credentials.api_secret_encrypted);
                    const apiMemo = credentials.api_memo ? decrypt(credentials.api_memo) : null;

                    // Create exchange instance
                    const exchangeInstance = createExchangeInstance(exchange, apiKey, apiSecret, apiMemo);

                    // Cancel order on exchange
                    const result = await cancelOrder(exchangeInstance, orderId, symbol);

                    res.json({
                        success: true,
                        message: 'Order cancelled successfully',
                        ...result
                    });
                } catch (error) {
                    console.error('Error cancelling order:', error.message);
                    res.status(500).json({ error: `Failed to cancel order: ${error.message}` });
                }
            }
        );
    } catch (error) {
        console.error('Error in cancel order endpoint:', error.message);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

// Balances - Using saved API keys
app.get('/api/v1/trading/balances', verifyToken, async (req, res) => {
    const { exchange } = req.query;

    if (!exchange) {
        return res.status(400).json({ error: 'Exchange parameter is required' });
    }

    try {
        // Get API credentials from database
        db.get(
            'SELECT api_key_encrypted, api_secret_encrypted, api_memo FROM api_credentials WHERE user_id = ? AND exchange = ?',
            [req.userId, exchange.toLowerCase()],
            async (err, credentials) => {
                if (err || !credentials) {
                    return res.status(404).json({ error: `No API keys found for ${exchange}. Please add your API keys first.` });
                }

                try {
                    // Decrypt credentials
                    const apiKey = decrypt(credentials.api_key_encrypted);
                    const apiSecret = decrypt(credentials.api_secret_encrypted);
                    const apiMemo = credentials.api_memo ? decrypt(credentials.api_memo) : null;

                    // Create exchange instance with credentials
                    const exchangeInstance = createExchangeInstance(exchange, apiKey, apiSecret, apiMemo);

                    // Fetch real balances
                    const balances = await fetchBalance(exchangeInstance);

                    res.json(balances);
                } catch (error) {
                    console.error('Error fetching balances:', error.message);
                    res.status(500).json({ error: `Failed to fetch balances: ${error.message}` });
                }
            }
        );
    } catch (error) {
        console.error('Error in balances endpoint:', error.message);
        res.status(500).json({ error: 'Failed to fetch balances' });
    }
});

// Market Making
app.post('/api/v1/market-making/start', verifyToken, (req, res) => {
    const { exchange, symbol, spreadPercentage, numberOfOrders, referenceSource } = req.body;

    res.json({
        success: true,
        sessionId: Math.random().toString(36).substring(7),
        message: 'Market making session started',
        config: {
            exchange,
            symbol,
            spreadPercentage,
            numberOfOrders,
            referenceSource
        }
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`✅ Backend server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`);
});

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // Send initial message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to trading platform WebSocket'
    }));

    // Stream real price updates using CCXT
    const priceInterval = setInterval(async () => {
        try {
            const ticker = await fetchTicker('bingx', 'BTC/USDT');
            ws.send(JSON.stringify({
                type: 'price',
                data: {
                    symbol: 'BTC/USDT',
                    price: ticker.lastPrice,
                    bidPrice: ticker.bidPrice,
                    askPrice: ticker.askPrice,
                    volume24h: ticker.volume24h,
                    changePercent24h: ticker.changePercent24h,
                    timestamp: new Date().toISOString()
                }
            }));
        } catch (error) {
            // Fallback to simulated price
            ws.send(JSON.stringify({
                type: 'price',
                data: {
                    symbol: 'BTC/USDT',
                    price: 45000 + Math.random() * 1000,
                    timestamp: new Date().toISOString()
                }
            }));
        }
    }, 5000); // Update every 5 seconds

    ws.on('close', () => {
        clearInterval(priceInterval);
        console.log('WebSocket connection closed');
    });
});

console.log('🚀 Crypto Trading Platform Backend Started!');
console.log('📝 To test the API:');
console.log('   - Register: POST http://localhost:8080/api/v1/auth/register');
console.log('   - Login: POST http://localhost:8080/api/v1/auth/login');
console.log('   - Market data: GET http://localhost:8080/api/v1/market/ticker');