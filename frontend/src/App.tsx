import { useState, useEffect } from 'react'
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  IconButton,
  Card,
  CardContent,
  Divider,
  LinearProgress,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  Settings,
  Refresh,
} from '@mui/icons-material'
import axios from 'axios'
import './App.css'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff88',
    },
    secondary: {
      main: '#ff4444',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
  },
})

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

function App() {
  const [tabValue, setTabValue] = useState(0)
  const [selectedExchange, setSelectedExchange] = useState('bingx')
  const [selectedPair, setSelectedPair] = useState('BTC/USDT')
  const [ticker, setTicker] = useState<any>(null)
  const [dexPrice, setDexPrice] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<any[]>([])

  // Market Making State
  const [mmConfig, setMmConfig] = useState({
    spread: 0.5,
    numOrders: 4,
    referenceSource: 'CEX',
  })

  // Order Form State
  const [orderForm, setOrderForm] = useState({
    side: 'BUY',
    type: 'LIMIT',
    quantity: '',
    price: '',
  })

  // Fetch market data
  const fetchMarketData = async () => {
    try {
      const [tickerRes, dexRes] = await Promise.all([
        axios.get(`http://localhost:8080/api/v1/market/ticker?symbol=${selectedPair}&exchange=${selectedExchange}`),
        axios.get('http://localhost:8080/api/v1/market/dex-price'),
      ])
      setTicker(tickerRes.data)
      setDexPrice(dexRes.data)
    } catch (error) {
      console.error('Error fetching market data:', error)
    }
  }

  useEffect(() => {
    fetchMarketData()
    const interval = setInterval(fetchMarketData, 5000)
    return () => clearInterval(interval)
  }, [selectedExchange, selectedPair])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price)
  }

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        {/* Header */}
        <AppBar position="static" sx={{ background: '#1a1a1a' }}>
          <Toolbar>
            <ShowChart sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Crypto Trading Platform
            </Typography>

            {/* Exchange Selector */}
            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
              <Select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                sx={{ color: 'white' }}
              >
                <MenuItem value="bingx">BingX</MenuItem>
                <MenuItem value="bitmart">BitMart</MenuItem>
                <MenuItem value="ascendx">AscendX</MenuItem>
                <MenuItem value="gateio">Gate.io</MenuItem>
                <MenuItem value="mexc">MEXC</MenuItem>
              </Select>
            </FormControl>

            {/* Trading Pair Selector */}
            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
              <Select
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                sx={{ color: 'white' }}
              >
                <MenuItem value="BTC/USDT">BTC/USDT</MenuItem>
                <MenuItem value="ETH/USDT">ETH/USDT</MenuItem>
                <MenuItem value="BNB/USDT">BNB/USDT</MenuItem>
                <MenuItem value="SOL/USDT">SOL/USDT</MenuItem>
                <MenuItem value="LAND/USDT">LAND/USDT</MenuItem>
              </Select>
            </FormControl>

            <IconButton color="inherit" onClick={fetchMarketData}>
              <Refresh />
            </IconButton>
            <IconButton color="inherit">
              <Settings />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 3 }}>
          {/* Price Display Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    CEX Price ({selectedExchange.toUpperCase()})
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ color: '#00ff88' }}>
                    {ticker ? formatPrice(ticker.lastPrice) : '---'}
                  </Typography>
                  {ticker && (
                    <Box sx={{ mt: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            24h Change
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ color: ticker.changePercent24h >= 0 ? '#00ff88' : '#ff4444' }}
                          >
                            {formatPercent(ticker.changePercent24h)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            24h Volume
                          </Typography>
                          <Typography variant="body1">
                            ${(ticker.volume24h / 1000000).toFixed(2)}M
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    DEX Price (LANDSHARE/USDT)
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ color: '#ffa500' }}>
                    {dexPrice ? formatPrice(dexPrice.price) : '---'}
                  </Typography>
                  {dexPrice && (
                    <Box sx={{ mt: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            24h Change
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ color: dexPrice.priceChange24h >= 0 ? '#00ff88' : '#ff4444' }}
                          >
                            {formatPercent(dexPrice.priceChange24h)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Liquidity
                          </Typography>
                          <Typography variant="body1">
                            ${(dexPrice.liquidity / 1000000).toFixed(2)}M
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Main Trading Interface */}
          <Paper sx={{ p: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Limit Orders" />
              <Tab label="Market Making" />
              <Tab label="Order History" />
              <Tab label="Balances" />
            </Tabs>

            {/* Limit Orders Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Place Order
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Side</InputLabel>
                      <Select
                        value={orderForm.side}
                        label="Side"
                        onChange={(e) => setOrderForm({ ...orderForm, side: e.target.value })}
                      >
                        <MenuItem value="BUY">Buy</MenuItem>
                        <MenuItem value="SELL">Sell</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Price"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                      sx={{ mb: 2 }}
                      type="number"
                    />
                    <TextField
                      fullWidth
                      label="Quantity"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                      sx={{ mb: 2 }}
                      type="number"
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{
                        bgcolor: orderForm.side === 'BUY' ? '#00ff88' : '#ff4444',
                        color: '#000',
                      }}
                    >
                      Place {orderForm.side} Order
                    </Button>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Order Book
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Price</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Mock sell orders */}
                          <TableRow sx={{ bgcolor: 'rgba(255, 68, 68, 0.1)' }}>
                            <TableCell sx={{ color: '#ff4444' }}>45,250.00</TableCell>
                            <TableCell align="right">0.5</TableCell>
                            <TableCell align="right">22,625.00</TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: 'rgba(255, 68, 68, 0.1)' }}>
                            <TableCell sx={{ color: '#ff4444' }}>45,200.00</TableCell>
                            <TableCell align="right">1.2</TableCell>
                            <TableCell align="right">54,240.00</TableCell>
                          </TableRow>
                          <Divider />
                          {/* Mock buy orders */}
                          <TableRow sx={{ bgcolor: 'rgba(0, 255, 136, 0.1)' }}>
                            <TableCell sx={{ color: '#00ff88' }}>44,950.00</TableCell>
                            <TableCell align="right">0.8</TableCell>
                            <TableCell align="right">35,960.00</TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: 'rgba(0, 255, 136, 0.1)' }}>
                            <TableCell sx={{ color: '#00ff88' }}>44,900.00</TableCell>
                            <TableCell align="right">2.1</TableCell>
                            <TableCell align="right">94,290.00</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Market Making Tab */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Market Making Configuration
                    </Typography>
                    <TextField
                      fullWidth
                      label="Spread Percentage"
                      value={mmConfig.spread}
                      onChange={(e) =>
                        setMmConfig({ ...mmConfig, spread: parseFloat(e.target.value) })
                      }
                      sx={{ mb: 2 }}
                      type="number"
                      inputProps={{ step: 0.1, min: 0.1, max: 10 }}
                    />
                    <TextField
                      fullWidth
                      label="Number of Orders"
                      value={mmConfig.numOrders}
                      onChange={(e) =>
                        setMmConfig({ ...mmConfig, numOrders: parseInt(e.target.value) })
                      }
                      sx={{ mb: 2 }}
                      type="number"
                      inputProps={{ step: 2, min: 2, max: 20 }}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Reference Source</InputLabel>
                      <Select
                        value={mmConfig.referenceSource}
                        label="Reference Source"
                        onChange={(e) =>
                          setMmConfig({ ...mmConfig, referenceSource: e.target.value })
                        }
                      >
                        <MenuItem value="CEX">CEX Price</MenuItem>
                        <MenuItem value="DEX">DEX Price</MenuItem>
                      </Select>
                    </FormControl>
                    <Button fullWidth variant="contained" color="primary">
                      Start Market Making
                    </Button>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Active Sessions
                    </Typography>
                    <Alert severity="info">No active market making sessions</Alert>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Order History Tab */}
            <TabPanel value={tabValue} index={2}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Pair</TableCell>
                      <TableCell>Side</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No orders yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order, index) => (
                        <TableRow key={index}>
                          <TableCell>{order.time}</TableCell>
                          <TableCell>{order.pair}</TableCell>
                          <TableCell>
                            <Chip
                              label={order.side}
                              size="small"
                              color={order.side === 'BUY' ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>{order.price}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>
                            <Chip label={order.status} size="small" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* Balances Tab */}
            <TabPanel value={tabValue} index={3}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Currency</TableCell>
                      <TableCell align="right">Available</TableCell>
                      <TableCell align="right">Locked</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">USD Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>USDT</TableCell>
                      <TableCell align="right">10,000.00</TableCell>
                      <TableCell align="right">0.00</TableCell>
                      <TableCell align="right">10,000.00</TableCell>
                      <TableCell align="right">$10,000.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>BTC</TableCell>
                      <TableCell align="right">0.5000</TableCell>
                      <TableCell align="right">0.0000</TableCell>
                      <TableCell align="right">0.5000</TableCell>
                      <TableCell align="right">$22,500.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>ETH</TableCell>
                      <TableCell align="right">2.5000</TableCell>
                      <TableCell align="right">0.0000</TableCell>
                      <TableCell align="right">2.5000</TableCell>
                      <TableCell align="right">$4,500.00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
