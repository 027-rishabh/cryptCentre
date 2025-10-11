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
 * Market Making Bot - Cluster-Based Strategy
 * Places 1 buy + 1 sell order at equal distance from mid price
 * CEX reference: refreshes every 2 minutes
 * DEX reference: waits 2 minutes after fill before placing new orders
 */
class MarketMakingBot {
    constructor(config, db, userId) {
        this.sessionId = config.sessionId;
        this.userId = userId;
        this.exchange = config.exchange;
        this.symbol = config.symbol;
        this.spreadPercentage = config.spreadPercentage;
        this.totalAmount = config.totalAmount; // Total capital to deploy
        this.referenceSource = config.referenceSource; // 'CEX' or 'DEX'

        // State
        this.isRunning = false;
        this.exchangeInstance = null;
        this.currentCluster = null; // Current active cluster
        this.clusters = []; // History of all clusters
        this.lastMidPrice = null;
        this.db = db;

        // Monitoring intervals
        this.fillCheckInterval = null;
        this.cexRefreshInterval = null; // Only for CEX reference
        this.dexDelayTimeout = null; // For DEX 2-minute delay

        // Configuration
        this.fillCheckFrequency = 5000; // Check fills every 5 seconds
        this.cexRefreshTime = 120000; // 2 minutes for CEX refresh
        this.dexDelayTime = 120000; // 2 minutes delay for DEX after fill

        // Statistics
        this.startTime = Date.now();
        this.totalFills = 0;
        this.totalClusters = 0;
    }

    /**
     * Start the market making bot
     */
    async start(apiKey, apiSecret, apiMemo) {
        try {
            console.log(`[MM Bot ${this.sessionId}] Starting cluster-based market making`);
            console.log(`[MM Bot ${this.sessionId}] Total Amount: ${this.totalAmount} USDT`);
            console.log(`[MM Bot ${this.sessionId}] Reference: ${this.referenceSource}`);
            console.log(`[MM Bot ${this.sessionId}] Spread: ${this.spreadPercentage}%`);

            // Create exchange instance
            this.exchangeInstance = await createExchangeInstance(this.exchange, apiKey, apiSecret, apiMemo);
            await this.exchangeInstance.loadMarkets();

            // Validate symbol
            if (!this.exchangeInstance.markets[this.symbol]) {
                throw new Error(`Symbol ${this.symbol} not available on ${this.exchange}`);
            }

            // Get initial mid price
            this.lastMidPrice = await this.getMidPrice();
            console.log(`[MM Bot ${this.sessionId}] Initial mid price: ${this.lastMidPrice}`);

            // Place first cluster
            await this.placeNewCluster(this.lastMidPrice);

            // Mark as running
            this.isRunning = true;
            this.updateSessionStatus('running');

            // Start monitoring
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
     * Get mid price from CEX or DEX
     */
    async getMidPrice() {
        try {
            if (this.referenceSource === 'CEX') {
                const ticker = await fetchTicker(this.exchange, this.symbol);
                // Mid price = average of bid and ask
                return (ticker.bidPrice + ticker.askPrice) / 2;
            } else if (this.referenceSource === 'DEX') {
                // Fetch from DexScreener
                const response = await axios.get(
                    'https://api.dexscreener.com/latest/dex/pairs/bsc/0x13f80c53b837622e899e1ac0021ed3d1775caefa'
                );
                return parseFloat(response.data.pair.priceUsd);
            }
        } catch (error) {
            console.error(`[MM Bot ${this.sessionId}] Failed to get mid price:`, error.message);
            // Use last known price if available
            return this.lastMidPrice || null;
        }
    }

    /**
     * Place a new cluster (1 buy + 1 sell order)
     */
    async placeNewCluster(midPrice) {
        try {
            console.log(`[MM Bot ${this.sessionId}] Placing new cluster at mid price: ${midPrice}`);

            // Calculate spread in absolute value
            const spreadAmount = midPrice * (this.spreadPercentage / 100);

            // Calculate prices
            const buyPrice = this.roundPrice(midPrice - spreadAmount);
            const sellPrice = this.roundPrice(midPrice + spreadAmount);

            // Split total amount 50/50
            const usdtAmount = this.totalAmount / 2; // 50% for buy side
            const btcAmount = (this.totalAmount / 2) / sellPrice; // 50% for sell side

            // Calculate quantities
            const buyQuantity = this.roundQuantity(usdtAmount / buyPrice); // BTC to buy
            const sellQuantity = this.roundQuantity(btcAmount); // BTC to sell

            console.log(`[MM Bot ${this.sessionId}] Buy: ${buyQuantity} @ ${buyPrice}`);
            console.log(`[MM Bot ${this.sessionId}] Sell: ${sellQuantity} @ ${sellPrice}`);

            // Place buy order
            const buyOrder = await createLimitOrder(
                this.exchangeInstance,
                this.symbol,
                'buy',
                buyQuantity,
                buyPrice
            );

            console.log(`[MM Bot ${this.sessionId}] Buy order placed: ${buyOrder.id}`);

            // Small delay
            await this.sleep(200);

            // Place sell order
            const sellOrder = await createLimitOrder(
                this.exchangeInstance,
                this.symbol,
                'sell',
                sellQuantity,
                sellPrice
            );

            console.log(`[MM Bot ${this.sessionId}] Sell order placed: ${sellOrder.id}`);

            // Create cluster metadata
            const cluster = {
                clusterNumber: this.totalClusters + 1,
                midPrice: midPrice,
                buyOrder: {
                    id: buyOrder.id,
                    price: buyPrice,
                    quantity: buyQuantity,
                    filled: 0,
                    status: 'open'
                },
                sellOrder: {
                    id: sellOrder.id,
                    price: sellPrice,
                    quantity: sellQuantity,
                    filled: 0,
                    status: 'open'
                },
                spreadPercentage: this.spreadPercentage,
                totalAmount: this.totalAmount,
                createdAt: new Date().toISOString(),
                lastChecked: Date.now()
            };

            // Save cluster
            this.currentCluster = cluster;
            this.clusters.push(cluster);
            this.totalClusters++;

            // Save to database
            this.saveClusterToDb(cluster);

            console.log(`[MM Bot ${this.sessionId}] Cluster #${cluster.clusterNumber} created`);

        } catch (error) {
            console.error(`[MM Bot ${this.sessionId}] Failed to place cluster:`, error.message);
            throw error;
        }
    }

    /**
     * Start monitoring loops
     */
    startMonitoring() {
        // Monitor fills continuously
        this.fillCheckInterval = setInterval(async () => {
            if (!this.isRunning) return;

            try {
                await this.checkForFills();
            } catch (error) {
                console.error(`[MM Bot ${this.sessionId}] Fill check error:`, error.message);
            }
        }, this.fillCheckFrequency);

        // CEX-specific: Refresh orders every 2 minutes
        if (this.referenceSource === 'CEX') {
            this.cexRefreshInterval = setInterval(async () => {
                if (!this.isRunning) return;

                try {
                    await this.refreshForCEX();
                } catch (error) {
                    console.error(`[MM Bot ${this.sessionId}] CEX refresh error:`, error.message);
                }
            }, this.cexRefreshTime);

            console.log(`[MM Bot ${this.sessionId}] CEX refresh timer started (2 min intervals)`);
        }

        console.log(`[MM Bot ${this.sessionId}] Monitoring started`);
    }

    /**
     * Check for filled orders
     */
    async checkForFills() {
        if (!this.currentCluster) return;

        try {
            // Fetch current open orders
            const openOrders = await fetchOpenOrders(this.exchangeInstance, this.symbol);
            const openOrderIds = new Set(openOrders.map(o => o.id));

            let anyFill = false;
            let buyFilled = false;
            let sellFilled = false;

            // Check buy order
            if (this.currentCluster.buyOrder.status === 'open') {
                if (!openOrderIds.has(this.currentCluster.buyOrder.id)) {
                    // Buy order filled or partially filled
                    console.log(`[MM Bot ${this.sessionId}] BUY order filled!`);
                    this.currentCluster.buyOrder.status = 'filled';
                    this.currentCluster.buyOrder.filled = this.currentCluster.buyOrder.quantity;
                    buyFilled = true;
                    anyFill = true;
                    this.totalFills++;
                } else {
                    // Check for partial fill
                    const currentOrder = openOrders.find(o => o.id === this.currentCluster.buyOrder.id);
                    if (currentOrder && currentOrder.filled > 0) {
                        if (currentOrder.filled !== this.currentCluster.buyOrder.filled) {
                            console.log(`[MM Bot ${this.sessionId}] BUY order partially filled: ${currentOrder.filled}`);
                            this.currentCluster.buyOrder.filled = currentOrder.filled;
                            buyFilled = true;
                            anyFill = true;
                            this.totalFills++;
                        }
                    }
                }
            }

            // Check sell order
            if (this.currentCluster.sellOrder.status === 'open') {
                if (!openOrderIds.has(this.currentCluster.sellOrder.id)) {
                    // Sell order filled or partially filled
                    console.log(`[MM Bot ${this.sessionId}] SELL order filled!`);
                    this.currentCluster.sellOrder.status = 'filled';
                    this.currentCluster.sellOrder.filled = this.currentCluster.sellOrder.quantity;
                    sellFilled = true;
                    anyFill = true;
                    this.totalFills++;
                } else {
                    // Check for partial fill
                    const currentOrder = openOrders.find(o => o.id === this.currentCluster.sellOrder.id);
                    if (currentOrder && currentOrder.filled > 0) {
                        if (currentOrder.filled !== this.currentCluster.sellOrder.filled) {
                            console.log(`[MM Bot ${this.sessionId}] SELL order partially filled: ${currentOrder.filled}`);
                            this.currentCluster.sellOrder.filled = currentOrder.filled;
                            sellFilled = true;
                            anyFill = true;
                            this.totalFills++;
                        }
                    }
                }
            }

            // If ANY fill occurred, handle replacement based on reference source
            if (anyFill) {
                if (this.referenceSource === 'DEX') {
                    // DEX mode: Wait 2 minutes before placing new orders
                    console.log(`[MM Bot ${this.sessionId}] Fill detected - waiting 2 minutes before placing replacement orders (DEX mode)`);

                    // Clear any existing timeout
                    if (this.dexDelayTimeout) {
                        clearTimeout(this.dexDelayTimeout);
                    }

                    // Schedule order replacement after 2 minutes
                    this.dexDelayTimeout = setTimeout(async () => {
                        try {
                            console.log(`[MM Bot ${this.sessionId}] 2-minute delay complete - placing replacement orders`);
                            await this.replaceFilledOrders(buyFilled, sellFilled);
                        } catch (error) {
                            console.error(`[MM Bot ${this.sessionId}] Error during delayed order replacement:`, error.message);
                        }
                    }, this.dexDelayTime);

                    console.log(`[MM Bot ${this.sessionId}] Replacement orders scheduled in 2 minutes`);
                } else {
                    // CEX mode: Replace immediately
                    console.log(`[MM Bot ${this.sessionId}] Fill detected - placing replacement orders immediately (CEX mode)`);
                    await this.replaceFilledOrders(buyFilled, sellFilled);
                }
            }

            // Update cluster metadata
            this.currentCluster.lastChecked = Date.now();
            this.updateClusterInDb(this.currentCluster);

        } catch (error) {
            console.error(`[MM Bot ${this.sessionId}] Error checking fills:`, error.message);
        }
    }

    /**
     * Replace filled orders at the SAME prices
     */
    async replaceFilledOrders(buyFilled, sellFilled) {
        try {
            const cluster = this.currentCluster;

            // Replace buy order if it was filled
            if (buyFilled) {
                const buyQuantity = cluster.buyOrder.quantity;
                const buyPrice = cluster.buyOrder.price;

                console.log(`[MM Bot ${this.sessionId}] Replacing BUY order: ${buyQuantity} @ ${buyPrice}`);

                const newBuyOrder = await createLimitOrder(
                    this.exchangeInstance,
                    this.symbol,
                    'buy',
                    buyQuantity,
                    buyPrice
                );

                cluster.buyOrder = {
                    id: newBuyOrder.id,
                    price: buyPrice,
                    quantity: buyQuantity,
                    filled: 0,
                    status: 'open'
                };

                console.log(`[MM Bot ${this.sessionId}] New BUY order placed: ${newBuyOrder.id}`);
            }

            // Replace sell order if it was filled
            if (sellFilled) {
                await this.sleep(200);

                const sellQuantity = cluster.sellOrder.quantity;
                const sellPrice = cluster.sellOrder.price;

                console.log(`[MM Bot ${this.sessionId}] Replacing SELL order: ${sellQuantity} @ ${sellPrice}`);

                const newSellOrder = await createLimitOrder(
                    this.exchangeInstance,
                    this.symbol,
                    'sell',
                    sellQuantity,
                    sellPrice
                );

                cluster.sellOrder = {
                    id: newSellOrder.id,
                    price: sellPrice,
                    quantity: sellQuantity,
                    filled: 0,
                    status: 'open'
                };

                console.log(`[MM Bot ${this.sessionId}] New SELL order placed: ${newSellOrder.id}`);
            }

            // Update database
            this.updateClusterInDb(cluster);

        } catch (error) {
            console.error(`[MM Bot ${this.sessionId}] Error replacing orders:`, error.message);
        }
    }

    /**
     * CEX-specific: Refresh orders every 2 minutes with new mid price
     */
    async refreshForCEX() {
        console.log(`[MM Bot ${this.sessionId}] CEX 2-minute refresh triggered`);

        try {
            // Get new mid price
            const newMidPrice = await this.getMidPrice();

            if (!newMidPrice) {
                console.log(`[MM Bot ${this.sessionId}] Could not fetch new mid price, skipping refresh`);
                return;
            }

            console.log(`[MM Bot ${this.sessionId}] New mid price: ${newMidPrice} (previous: ${this.lastMidPrice})`);

            // Cancel all current orders
            await this.cancelCurrentCluster();

            // Update mid price
            this.lastMidPrice = newMidPrice;

            // Place new cluster with updated mid price
            await this.placeNewCluster(newMidPrice);

            console.log(`[MM Bot ${this.sessionId}] CEX refresh complete`);

        } catch (error) {
            console.error(`[MM Bot ${this.sessionId}] CEX refresh failed:`, error.message);
        }
    }

    /**
     * Cancel all orders in current cluster
     */
    async cancelCurrentCluster() {
        if (!this.currentCluster) return;

        try {
            // Cancel buy order if still open
            if (this.currentCluster.buyOrder.status === 'open') {
                try {
                    await cancelOrder(
                        this.exchangeInstance,
                        this.currentCluster.buyOrder.id,
                        this.symbol
                    );
                    console.log(`[MM Bot ${this.sessionId}] Cancelled buy order ${this.currentCluster.buyOrder.id}`);
                } catch (error) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to cancel buy order:`, error.message);
                }
            }

            await this.sleep(200);

            // Cancel sell order if still open
            if (this.currentCluster.sellOrder.status === 'open') {
                try {
                    await cancelOrder(
                        this.exchangeInstance,
                        this.currentCluster.sellOrder.id,
                        this.symbol
                    );
                    console.log(`[MM Bot ${this.sessionId}] Cancelled sell order ${this.currentCluster.sellOrder.id}`);
                } catch (error) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to cancel sell order:`, error.message);
                }
            }

        } catch (error) {
            console.error(`[MM Bot ${this.sessionId}] Error cancelling cluster:`, error.message);
        }
    }

    /**
     * Stop the bot
     */
    async stop() {
        console.log(`[MM Bot ${this.sessionId}] Stopping market making...`);

        this.isRunning = false;

        // Stop monitoring intervals
        if (this.fillCheckInterval) {
            clearInterval(this.fillCheckInterval);
            this.fillCheckInterval = null;
        }

        if (this.cexRefreshInterval) {
            clearInterval(this.cexRefreshInterval);
            this.cexRefreshInterval = null;
        }

        // Clear DEX delay timeout
        if (this.dexDelayTimeout) {
            clearTimeout(this.dexDelayTimeout);
            this.dexDelayTimeout = null;
            console.log(`[MM Bot ${this.sessionId}] Cleared pending DEX order replacement`);
        }

        // Cancel all active orders
        await this.cancelCurrentCluster();

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
            symbol: this.symbol,
            exchange: this.exchange,
            referenceSource: this.referenceSource,
            totalAmount: this.totalAmount,
            spreadPercentage: this.spreadPercentage,
            currentCluster: this.currentCluster,
            totalClusters: this.totalClusters,
            totalFills: this.totalFills,
            lastMidPrice: this.lastMidPrice,
            uptime: Math.floor((Date.now() - this.startTime) / 1000)
        };
    }

    /**
     * Save cluster to database
     */
    saveClusterToDb(cluster) {
        this.db.run(
            `INSERT INTO mm_clusters
            (session_id, cluster_number, mid_price, buy_price, buy_quantity, sell_price, sell_quantity,
             spread_percentage, total_amount, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                this.sessionId,
                cluster.clusterNumber,
                cluster.midPrice,
                cluster.buyOrder.price,
                cluster.buyOrder.quantity,
                cluster.sellOrder.price,
                cluster.sellOrder.quantity,
                cluster.spreadPercentage,
                cluster.totalAmount,
                cluster.createdAt
            ],
            (err) => {
                if (err) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to save cluster:`, err.message);
                }
            }
        );
    }

    /**
     * Update cluster in database
     */
    updateClusterInDb(cluster) {
        this.db.run(
            `UPDATE mm_clusters
             SET buy_filled = ?, buy_status = ?, sell_filled = ?, sell_status = ?, last_checked = ?
             WHERE session_id = ? AND cluster_number = ?`,
            [
                cluster.buyOrder.filled,
                cluster.buyOrder.status,
                cluster.sellOrder.filled,
                cluster.sellOrder.status,
                new Date().toISOString(),
                this.sessionId,
                cluster.clusterNumber
            ],
            (err) => {
                if (err) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to update cluster:`, err.message);
                }
            }
        );
    }

    /**
     * Update session status
     */
    updateSessionStatus(status, errorMessage = null) {
        this.db.run(
            `UPDATE market_making_sessions
             SET status = ?, error_message = ?, total_clusters = ?, total_fills = ?
             WHERE session_id = ?`,
            [status, errorMessage, this.totalClusters, this.totalFills, this.sessionId],
            (err) => {
                if (err) {
                    console.error(`[MM Bot ${this.sessionId}] Failed to update status:`, err.message);
                }
            }
        );
    }

    /**
     * Round price to appropriate precision
     */
    roundPrice(price) {
        return Math.round(price * 100000000) / 100000000;
    }

    /**
     * Round quantity to appropriate precision
     */
    roundQuantity(quantity) {
        return Math.round(quantity * 100000000) / 100000000;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default MarketMakingBot;
