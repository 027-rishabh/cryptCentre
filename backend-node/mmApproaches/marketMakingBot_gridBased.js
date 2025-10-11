import {
    createExchangeInstance,
    fetchTicker,
    fetchBalance,
    fetchOpenOrders,
    createLimitOrder,
    cancelOrder,
} from './exchangeConnector.js';
import axios from 'axios';

/**
 * Market Making Bot
 * Implements a continuous two-sided market making strategy
 */
class MarketMakingBot {
    constructor(config, db, userId) {
        this.sessionId = config.sessionId;
        this.userId = userId;
        this.exchange = config.exchange;
        this.symbol = config.symbol;
        this.spreadPercentage = config.spreadPercentage;
        this.numberOfOrders = config.numberOfOrders;
        this.referenceSource = config.referenceSource;
        this.baseOrderSize = config.baseOrderSize || 0.001; // Default base size
        this.refreshInterval = config.refreshInterval || 30000; // 30 seconds
        this.priceMovementThreshold = config.priceMovementThreshold || 0.5; // 0.5%

        // State
        this.isRunning = false;
        this.isPaused = false;
        this.exchangeInstance = null;
        this.activeOrders = [];
        this.lastReferencePrice = null;
        this.totalPnL = 0;
        this.ordersFilled = 0;
        this.db = db;

        // Monitoring
        this.monitorIntervalId = null;
        this.startTime = Date.now();
    }

    /**
     * Initialize and start the market making bot
     */
    async start(apiKey, apiSecret, apiMemo) {
        try {
            console.log(`[MM Bot ${this.sessionId}] Starting market making for ${this.symbol} on ${this.exchange}`);

            // Create exchange instance
            this.exchangeInstance = await createExchangeInstance(this.exchange, apiKey, apiSecret, apiMemo);

            // Load markets to ensure symbol is valid
            await this.exchangeInstance.loadMarkets();
            if (!this.exchangeInstance.markets[this.symbol]) {
                throw new Error(`Symbol ${this.symbol} not available on ${this.exchange}`);
            }

            // Check balance
            const balance = await fetchBalance(this.exchangeInstance);
            console.log(`[MM Bot ${this.sessionId}] Account balance fetched`);

            // Get initial reference price
            this.lastReferencePrice = await this.getReferencePrice();
            console.log(`[MM Bot ${this.sessionId}] Initial reference price: ${this.lastReferencePrice}`);

            // Calculate and place initial orders
            await this.placeInitialOrders();

            // Mark as running
            this.isRunning = true;

            // Update database
            this.updateSessionStatus('running');

            // Start monitoring loop
            this.startMonitoring();

            console.log(`[MM Bot ${this.sessionId}] Market making started successfully`);
            return { success: true, message: 'Market making started' };

        } catch (error) {
            console.error(`[MM Bot ${this.sessionId}] Failed to start:`, error.message);
            this.updateSessionStatus('failed', error.message);
            throw error;
        }
    }

    /**
     * Get reference price from CEX or DEX
     */
    async getReferencePrice() {
        try {
            if (this.referenceSource === 'CEX') {
                const ticker = await fetchTicker(this.exchange, this.symbol);
                // Use mid price (average of bid and ask)
                return (ticker.bidPrice + ticker.askPrice) / 2;
            } else if (this.referenceSource === 'DEX') {
                // Fetch from DexScreener
                const response = await axios.get(
                    'https://api.dexscreener.com/latest/dex/pairs/bsc/0x13f80c53b837622e899e1ac0021ed3d1775caefa'
                );
                return parseFloat(response.data.pair.priceUsd);
            } else {
                throw new Error('Invalid reference source');
            }
        } catch (error) {
            console.error(`[MM Bot ${this.sessionId}] Failed to get reference price:`, error.message);
            // Fallback to last known price
            return this.lastReferencePrice;
        }
    }

    /**
     * Calculate order prices and quantities
     */
    calculateOrderBook(referencePrice) {
        const orders = [];
        const spreadAmount = referencePrice * (this.spreadPercentage / 100);
        const ordersPerSide = Math.floor(this.numberOfOrders / 2);

        // Calculate buy orders (below reference price)
        for (let i = 1; i <= ordersPerSide; i++) {
            const spreadFactor = i / ordersPerSide; // 0 to 1
            const price = referencePrice - (spreadAmount * spreadFactor);
            const quantity = this.calculateOrderQuantity(i, ordersPerSide);

            orders.push({
                side: 'buy',
                price: this.roundPrice(price),
                quantity: this.roundQuantity(quantity),
                level: i
            });
        }

        // Calculate sell orders (above reference price)
        for (let i = 1; i <= ordersPerSide; i++) {
            const spreadFactor = i / ordersPerSide; // 0 to 1
            const price = referencePrice + (spreadAmount * spreadFactor);
            const quantity = this.calculateOrderQuantity(i, ordersPerSide);

            orders.push({
                side: 'sell',
                price: this.roundPrice(price),
                quantity: this.roundQuantity(quantity),
                level: i
            });
        }

        return orders;
    }

    /**
     * Calculate order quantity with ladder sizing
     * Closer orders to mid price are smaller, further orders are larger
     */
    calculateOrderQuantity(level, maxLevel) {
        // Inverse ladder: level 1 (closest) gets smallest size
        const sizeFactor = level / maxLevel;
        return this.baseOrderSize * (1 + sizeFactor);
    }

    /**
     * Round price to appropriate precision
     */
    roundPrice(price) {
        // Round to 8 decimal places for crypto
        return Math.round(price * 100000000) / 100000000;
    }

    /**
     * Round quantity to appropriate precision
     */
    roundQuantity(quantity) {
        // Round to 8 decimal places
        return Math.round(quantity * 100000000) / 100000000;
    }

    /**
     * Place initial orders on exchange
     */
    async placeInitialOrders() {
        const orderBook = this.calculateOrderBook(this.lastReferencePrice);

        console.log(`[MM Bot ${this.sessionId}] Placing ${orderBook.length} orders...`);

        for (const order of orderBook) {
            try {
                const placedOrder = await createLimitOrder(
                    this.exchangeInstance,
                    this.symbol,
                    order.side,
                    order.quantity,
                    order.price
                );

                this.activeOrders.push({
                    ...placedOrder,
                    level: order.level,
                    placedAt: Date.now()
                });

                // Save to database
                this.saveOrderToDb(placedOrder, order.level);

                console.log(`[MM Bot ${this.sessionId}] Placed ${order.side} order at ${order.price}`);

                // Small delay to avoid rate limiting
                await this.sleep(100);

            } catch (error) {
                console.error(`[MM Bot ${this.sessionId}] Failed to place order:`, error.message);
            }
        }

        console.log(`[MM Bot ${this.sessionId}] Successfully placed ${this.activeOrders.length} orders`);
    }

    /**
     * Start continuous monitoring loop
     */
    startMonitoring() {
        this.monitorIntervalId = setInterval(async () => {
            if (!this.isRunning || this.isPaused) return;

            try {
                await this.monitorAndAdjust();
            } catch (error) {
                console.error(`[MM Bot ${this.sessionId}] Monitoring error:`, error.message);
            }
        }, this.refreshInterval);

        console.log(`[MM Bot ${this.sessionId}] Monitoring started (interval: ${this.refreshInterval}ms)`);
    }

    /**
     * Monitor orders and adjust if needed
     */
    async monitorAndAdjust() {
        console.log(`[MM Bot ${this.sessionId}] Monitoring cycle...`);

        // 1. Get current open orders from exchange
        const openOrders = await fetchOpenOrders(this.exchangeInstance, this.symbol);

        // 2. Check for filled orders
        const filledOrders = this.detectFilledOrders(openOrders);
        if (filledOrders.length > 0) {
            console.log(`[MM Bot ${this.sessionId}] Detected ${filledOrders.length} filled orders`);
            this.ordersFilled += filledOrders.length;
            this.updateFilledOrders(filledOrders);
        }

        // 3. Get new reference price
        const newReferencePrice = await this.getReferencePrice();
        const priceChange = Math.abs((newReferencePrice - this.lastReferencePrice) / this.lastReferencePrice * 100);

        console.log(`[MM Bot ${this.sessionId}] Ref price: ${newReferencePrice} (change: ${priceChange.toFixed(3)}%)`);

        // 4. If price moved significantly, refresh all orders
        if (priceChange > this.priceMovementThreshold) {
            console.log(`[MM Bot ${this.sessionId}] Price moved ${priceChange.toFixed(2)}% - refreshing orders`);
            await this.refreshAllOrders(newReferencePrice);
            this.lastReferencePrice = newReferencePrice;
        }

        // 5. Replace filled orders
        if (filledOrders.length > 0) {
            await this.replaceFilledOrders(newReferencePrice);
        }

        // 6. Update session statistics
        this.updateSessionStats();
    }

    /**
     * Detect which orders have been filled
     */
    detectFilledOrders(currentOpenOrders) {
        const openOrderIds = new Set(currentOpenOrders.map(o => o.id));
        const filledOrders = this.activeOrders.filter(order => !openOrderIds.has(order.id));

        // Remove filled orders from active list
        this.activeOrders = this.activeOrders.filter(order => openOrderIds.has(order.id));

        return filledOrders;
    }

    /**
     * Update filled orders in database
     */
    updateFilledOrders(filledOrders) {
        for (const order of filledOrders) {
            this.db.run(
                `UPDATE mm_orders SET status = 'filled', filled_at = CURRENT_TIMESTAMP
                 WHERE exchange_order_id = ? AND session_id = ?`,
                [order.id, this.sessionId],
                (err) => {
                    if (err) {
                        console.error(`[MM Bot ${this.sessionId}] Failed to update filled order:`, err.message);
                    }
                }
            );
        }
    }

    /**
     * Cancel all active orders and place new ones
     */
    async refreshAllOrders(newReferencePrice) {
        console.log(`[MM Bot ${this.sessionId}] Cancelling all orders...`);

        // Cancel all active orders
        for (const order of this.activeOrders) {
            try {
                await cancelOrder(this.exchangeInstance, order.id, this.symbol);
                await this.sleep(100);
            } catch (error) {
                console.error(`[MM Bot ${this.sessionId}] Failed to cancel order ${order.id}:`, error.message);
            }
        }

        this.activeOrders = [];

        // Place new orders at new price levels
        await this.placeInitialOrders();
    }

    /**
     * Replace only the filled orders
     */
    async replaceFilledOrders(referencePrice) {
        const orderBook = this.calculateOrderBook(referencePrice);

        // Only place orders if we have fewer than expected
        const expectedOrders = this.numberOfOrders;
        const currentOrders = this.activeOrders.length;
        const ordersToPlace = expectedOrders - currentOrders;

        if (ordersToPlace > 0) {
            console.log(`[MM Bot ${this.sessionId}] Placing ${ordersToPlace} replacement orders`);

            // Place the missing orders
            for (let i = 0; i < Math.min(ordersToPlace, orderBook.length); i++) {
                const order = orderBook[i];
                try {
                    const placedOrder = await createLimitOrder(
                        this.exchangeInstance,
                        this.symbol,
                        order.side,
                        order.quantity,
                        order.price
                    );

                    this.activeOrders.push({
                        ...placedOrder,
                        level: order.level,
                        placedAt: Date.now()
                    });

                    this.saveOrderToDb(placedOrder, order.level);
                    await this.sleep(100);

                } catch (error) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to place replacement order:`, error.message);
                }
            }
        }
    }

    /**
     * Save order to database
     */
    saveOrderToDb(order, level) {
        this.db.run(
            `INSERT INTO mm_orders (session_id, exchange_order_id, side, price, quantity, level, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [this.sessionId, order.id, order.side, order.price, order.quantity, level, 'open'],
            (err) => {
                if (err) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to save order to DB:`, err.message);
                }
            }
        );
    }

    /**
     * Update session statistics
     */
    updateSessionStats() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);

        this.db.run(
            `UPDATE market_making_sessions
             SET orders_filled = ?, total_pnl = ?, uptime_seconds = ?
             WHERE session_id = ?`,
            [this.ordersFilled, this.totalPnL, uptime, this.sessionId],
            (err) => {
                if (err) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to update session stats:`, err.message);
                }
            }
        );
    }

    /**
     * Update session status in database
     */
    updateSessionStatus(status, errorMessage = null) {
        this.db.run(
            `UPDATE market_making_sessions SET status = ?, error_message = ? WHERE session_id = ?`,
            [status, errorMessage, this.sessionId],
            (err) => {
                if (err) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to update status:`, err.message);
                }
            }
        );
    }

    /**
     * Pause the bot (stop monitoring but keep orders)
     */
    pause() {
        console.log(`[MM Bot ${this.sessionId}] Pausing...`);
        this.isPaused = true;
        this.updateSessionStatus('paused');
    }

    /**
     * Resume the bot
     */
    resume() {
        console.log(`[MM Bot ${this.sessionId}] Resuming...`);
        this.isPaused = false;
        this.updateSessionStatus('running');
    }

    /**
     * Stop the bot and cancel all orders
     */
    async stop() {
        console.log(`[MM Bot ${this.sessionId}] Stopping market making...`);

        this.isRunning = false;

        // Stop monitoring
        if (this.monitorIntervalId) {
            clearInterval(this.monitorIntervalId);
            this.monitorIntervalId = null;
        }

        // Cancel all active orders
        for (const order of this.activeOrders) {
            try {
                await cancelOrder(this.exchangeInstance, order.id, this.symbol);
                console.log(`[MM Bot ${this.sessionId}] Cancelled order ${order.id}`);
            } catch (error) {
                console.error(`[MM Bot ${this.sessionId}] Failed to cancel order:`, error.message);
            }
        }

        this.activeOrders = [];

        // Update database
        this.db.run(
            `UPDATE market_making_sessions
             SET status = 'stopped', stopped_at = CURRENT_TIMESTAMP
             WHERE session_id = ?`,
            [this.sessionId],
            (err) => {
                if (err) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to update stop status:`, err.message);
                }
            }
        );

        console.log(`[MM Bot ${this.sessionId}] Stopped successfully`);
    }

    /**
     * Get current bot status
     */
    getStatus() {
        return {
            sessionId: this.sessionId,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            symbol: this.symbol,
            exchange: this.exchange,
            activeOrders: this.activeOrders.length,
            ordersFilled: this.ordersFilled,
            totalPnL: this.totalPnL,
            lastReferencePrice: this.lastReferencePrice,
            uptime: Math.floor((Date.now() - this.startTime) / 1000)
        };
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default MarketMakingBot;
