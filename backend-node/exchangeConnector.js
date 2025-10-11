import ccxt from 'ccxt';

// Exchange name mapping for CCXT
const EXCHANGE_MAP = {
  'bingx': 'bingx',
  'bitmart': 'bitmart',
  'ascendx': 'ascendex',  // CCXT uses 'ascendex' not 'ascendx'
  'gateio': 'gateio',
  'mexc': 'mexc'
};

// Create exchange instance with API credentials
export const createExchangeInstance = async (exchangeName, apiKey, apiSecret, apiMemo = null) => {
  try {
    const ccxtExchangeName = EXCHANGE_MAP[exchangeName.toLowerCase()];
    if (!ccxtExchangeName) {
      throw new Error(`Exchange ${exchangeName} not supported`);
    }

    const ExchangeClass = ccxt[ccxtExchangeName];
    if (!ExchangeClass) {
      throw new Error(`CCXT does not support ${ccxtExchangeName}`);
    }

    const config = {
      apiKey: apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
      }
    };

    // Handle exchange-specific authentication parameters
    if (apiMemo) {
      // BitMart uses 'uid' in the config
      if (ccxtExchangeName === 'bitmart') {
        config.uid = apiMemo;
      }
      // AscendEX: Don't use password, we'll fetch account group dynamically
      // The apiMemo can be left empty for AscendEX
      else if (ccxtExchangeName === 'ascendex') {
        // AscendEX account group will be fetched after initialization
        // Leave this empty for now
      }
      // Generic fallback for other exchanges that might need password
      else {
        config.password = apiMemo;
      }
    }

    const exchange = new ExchangeClass(config);

    // Special handling for AscendEX: fetch and set account group
    if (ccxtExchangeName === 'ascendex') {
      try {
        console.log('[AscendEX] Fetching account group...');
        await exchange.loadMarkets();

        // Fetch account info to get the account group
        const accountInfo = await exchange.privateGetInfo();

        if (accountInfo && accountInfo.data && accountInfo.data.accountGroup) {
          const accountGroup = accountInfo.data.accountGroup;
          console.log(`[AscendEX] Account group retrieved: ${accountGroup}`);

          // Set account group in exchange options
          exchange.options['account-group'] = accountGroup;

          // Also set it as a header for all requests
          if (!exchange.headers) {
            exchange.headers = {};
          }
          exchange.headers['x-auth-key'] = apiKey;
        } else {
          console.warn('[AscendEX] Could not retrieve account group from account info');
        }
      } catch (accountError) {
        console.error('[AscendEX] Error fetching account group:', accountError.message);
        // Continue anyway, some endpoints might still work
      }
    }

    return exchange;
  } catch (error) {
    console.error(`Error creating exchange instance for ${exchangeName}:`, error.message);
    throw error;
  }
};

// Fetch ticker from exchange (public API - no auth needed)
export const fetchTicker = async (exchangeName, symbol) => {
  try {
    const ccxtExchangeName = EXCHANGE_MAP[exchangeName.toLowerCase()];
    const ExchangeClass = ccxt[ccxtExchangeName];
    const exchange = new ExchangeClass({ enableRateLimit: true });

    // Load markets to validate if pair exists
    await exchange.loadMarkets();

    // Check if symbol exists on this exchange
    if (!exchange.markets[symbol]) {
      throw new Error(`Symbol ${symbol} is not available on ${exchangeName}`);
    }

    const ticker = await exchange.fetchTicker(symbol);

    // Calculate mid price properly
    const midPrice = (ticker.bid && ticker.ask)
      ? (parseFloat(ticker.bid) + parseFloat(ticker.ask)) / 2
      : ticker.last;

    return {
      symbol: symbol,
      exchange: exchangeName,
      lastPrice: ticker.last,
      midPrice: midPrice,
      bidPrice: ticker.bid,
      askPrice: ticker.ask,
      volume24h: ticker.baseVolume,
      high24h: ticker.high,
      low24h: ticker.low,
      changePercent24h: ticker.percentage || 0
    };
  } catch (error) {
    console.error(`Error fetching ticker from ${exchangeName}:`, error.message);
    throw error;
  }
};

// Fetch order book from exchange (public API)
export const fetchOrderBook = async (exchangeName, symbol, limit = 10) => {
  try {
    const ccxtExchangeName = EXCHANGE_MAP[exchangeName.toLowerCase()];
    const ExchangeClass = ccxt[ccxtExchangeName];
    const exchange = new ExchangeClass({ enableRateLimit: true });

    const orderBook = await exchange.fetchOrderBook(symbol, limit);

    return {
      bids: orderBook.bids.slice(0, limit).map(b => ({ price: b[0], quantity: b[1] })),
      asks: orderBook.asks.slice(0, limit).map(a => ({ price: a[0], quantity: a[1] }))
    };
  } catch (error) {
    console.error(`Error fetching order book from ${exchangeName}:`, error.message);
    throw error;
  }
};

// Fetch balance from exchange (requires authentication)
export const fetchBalance = async (exchange) => {
  try {
    const balance = await exchange.fetchBalance();

    const balances = [];
    for (const [currency, data] of Object.entries(balance.total)) {
      if (data && data > 0) {
        balances.push({
          currency: currency,
          available: balance.free[currency] || 0,
          locked: balance.used[currency] || 0,
          total: data
        });
      }
    }

    return balances;
  } catch (error) {
    console.error('Error fetching balance:', error.message);
    throw error;
  }
};

// Fetch open orders (requires authentication)
export const fetchOpenOrders = async (exchange, symbol = null) => {
  try {
    const orders = await exchange.fetchOpenOrders(symbol);

    return orders.map(order => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      type: order.type.toUpperCase(),
      price: order.price,
      quantity: order.amount,
      filled: order.filled,
      remaining: order.remaining,
      status: order.status.toUpperCase(),
      timestamp: order.timestamp,
      created_at: new Date(order.timestamp).toISOString()
    }));
  } catch (error) {
    console.error('Error fetching open orders:', error.message);
    throw error;
  }
};

// Fetch order history (requires authentication)
export const fetchOrderHistory = async (exchange, symbol = null, limit = 100) => {
  try {
    const orders = await exchange.fetchClosedOrders(symbol, undefined, limit);

    return orders.map(order => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      type: order.type.toUpperCase(),
      price: order.price,
      quantity: order.amount,
      filled: order.filled,
      status: order.status.toUpperCase(),
      timestamp: order.timestamp,
      created_at: new Date(order.timestamp).toISOString()
    }));
  } catch (error) {
    console.error('Error fetching order history:', error.message);
    throw error;
  }
};

// Create a limit order (requires authentication)
export const createLimitOrder = async (exchange, symbol, side, amount, price) => {
  try {
    const order = await exchange.createLimitOrder(symbol, side.toLowerCase(), amount, price);

    return {
      id: order.id,
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      type: order.type.toUpperCase(),
      price: order.price,
      quantity: order.amount,
      status: order.status.toUpperCase(),
      timestamp: order.timestamp,
      created_at: new Date(order.timestamp).toISOString()
    };
  } catch (error) {
    console.error('Error creating limit order:', error.message);
    throw error;
  }
};

// Create a market order (requires authentication)
export const createMarketOrder = async (exchange, symbol, side, amount) => {
  try {
    const order = await exchange.createMarketOrder(symbol, side.toLowerCase(), amount);

    return {
      id: order.id,
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      type: order.type.toUpperCase(),
      price: order.price || 0,
      quantity: order.amount,
      status: order.status.toUpperCase(),
      timestamp: order.timestamp,
      created_at: new Date(order.timestamp).toISOString()
    };
  } catch (error) {
    console.error('Error creating market order:', error.message);
    throw error;
  }
};

// Cancel an order (requires authentication)
export const cancelOrder = async (exchange, orderId, symbol) => {
  try {
    const result = await exchange.cancelOrder(orderId, symbol);
    return {
      success: true,
      orderId: result.id,
      status: result.status
    };
  } catch (error) {
    console.error('Error canceling order:', error.message);
    throw error;
  }
};

// Get available trading pairs for an exchange
export const getMarkets = async (exchangeName) => {
  try {
    const ccxtExchangeName = EXCHANGE_MAP[exchangeName.toLowerCase()];
    const ExchangeClass = ccxt[ccxtExchangeName];
    const exchange = new ExchangeClass({ enableRateLimit: true });

    await exchange.loadMarkets();

    const markets = Object.values(exchange.markets)
      .filter(market => market.active && market.spot)
      .map(market => ({
        symbol: market.symbol,
        base: market.base,
        quote: market.quote,
        active: market.active
      }));

    return markets;
  } catch (error) {
    console.error(`Error fetching markets from ${exchangeName}:`, error.message);
    throw error;
  }
};
