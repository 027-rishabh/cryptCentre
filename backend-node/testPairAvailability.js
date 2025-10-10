import ccxt from 'ccxt';

const EXCHANGE_MAP = {
  'bingx': 'bingx',
  'bitmart': 'bitmart',
  'ascendx': 'ascendex',
  'gateio': 'gateio',
  'mexc': 'mexc'
};

const testPairs = ['BTC/USDT', 'ETH/USDT', 'LAND/USDT', 'SOL/USDT'];

async function checkPairAvailability() {
  for (const [exchangeName, ccxtName] of Object.entries(EXCHANGE_MAP)) {
    console.log(`\n=== ${exchangeName.toUpperCase()} ===`);
    try {
      const ExchangeClass = ccxt[ccxtName];
      const exchange = new ExchangeClass({ enableRateLimit: true });

      await exchange.loadMarkets();

      for (const pair of testPairs) {
        const exists = exchange.markets[pair] !== undefined;
        const status = exists ? '✓ SUPPORTED' : '✗ NOT SUPPORTED';
        console.log(`${pair}: ${status}`);

        // If supported, try to fetch actual price
        if (exists) {
          try {
            const ticker = await exchange.fetchTicker(pair);
            console.log(`  → Last Price: ${ticker.last}, Bid: ${ticker.bid}, Ask: ${ticker.ask}`);
          } catch (err) {
            console.log(`  → Error fetching: ${err.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`Error loading markets: ${error.message}`);
    }
  }
}

checkPairAvailability();
