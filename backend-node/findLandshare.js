import ccxt from 'ccxt';

const EXCHANGE_MAP = {
  'bingx': 'bingx',
  'bitmart': 'bitmart',
  'ascendx': 'ascendex',
  'gateio': 'gateio',
  'mexc': 'mexc'
};

async function findLandshare() {
  console.log('Searching for LANDSHARE token across all exchanges...\n');

  for (const [exchangeName, ccxtName] of Object.entries(EXCHANGE_MAP)) {
    console.log(`\n=== ${exchangeName.toUpperCase()} ===`);
    try {
      const ExchangeClass = ccxt[ccxtName];
      const exchange = new ExchangeClass({ enableRateLimit: true });

      await exchange.loadMarkets();

      // Search for any symbol containing LAND
      const landPairs = Object.keys(exchange.markets).filter(symbol =>
        symbol.toUpperCase().includes('LAND')
      );

      if (landPairs.length === 0) {
        console.log('❌ No LANDSHARE pairs found');
      } else {
        console.log(`✓ Found ${landPairs.length} LAND-related pairs:`);
        landPairs.forEach(pair => {
          const market = exchange.markets[pair];
          console.log(`  - ${pair} (base: ${market.base}, quote: ${market.quote}, active: ${market.active})`);
        });

        // Try to fetch price for each pair
        for (const pair of landPairs.slice(0, 3)) { // Test first 3 to avoid rate limits
          try {
            const ticker = await exchange.fetchTicker(pair);
            console.log(`    → ${pair}: Last Price = ${ticker.last}, Bid = ${ticker.bid}, Ask = ${ticker.ask}`);
          } catch (err) {
            console.log(`    → ${pair}: Error fetching price - ${err.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
}

findLandshare();
