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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
  Autocomplete,
} from '@mui/material'
import {
  ShowChart,
  Settings,
  Refresh,
  Login as LoginIcon,
  Logout as LogoutIcon,
  VpnKey,
  Add,
  Delete,
  DeleteSweep,
  Visibility,
  VisibilityOff,
  AccountCircle,
  Stop,
} from '@mui/icons-material'
import axios from 'axios'

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

// All trading pairs for major exchanges
const TRADING_PAIRS = {
  bingx: [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'SOL/USDT', 'DOT/USDT', 'MATIC/USDT', 'AVAX/USDT',
    'LINK/USDT', 'LTC/USDT', 'UNI/USDT', 'ATOM/USDT', 'ETC/USDT',
    'XLM/USDT', 'TRX/USDT', 'NEAR/USDT', 'ALGO/USDT', 'FTM/USDT',
    'LAND/USDT', 'MANA/USDT', 'SAND/USDT', 'AXS/USDT', 'GALA/USDT',
  ],
  bitmart: [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
    'SOL/USDT', 'LUNA/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT',
    'SHIB/USDT', 'DOGE/USDT', 'UNI/USDT', 'LINK/USDT', 'LTC/USDT',
    'BCH/USDT', 'ATOM/USDT', 'ETC/USDT', 'XLM/USDT', 'ALGO/USDT',
  ],
  ascendx: [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
    'SOL/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT', 'LINK/USDT',
    'UNI/USDT', 'LTC/USDT', 'ATOM/USDT', 'NEAR/USDT', 'FTM/USDT',
  ],
  gateio: [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'SOL/USDT', 'DOT/USDT', 'AVAX/USDT', 'MATIC/USDT',
    'LINK/USDT', 'LTC/USDT', 'UNI/USDT', 'ATOM/USDT', 'NEAR/USDT',
    'ALGO/USDT', 'FTM/USDT', 'SAND/USDT', 'MANA/USDT', 'AXS/USDT',
    'LAND/USDT', 'CHZ/USDT', 'ENJ/USDT', 'THETA/USDT', 'ICP/USDT',
  ],
  mexc: [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
    'SOL/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT',
    'SHIB/USDT', 'LINK/USDT', 'LTC/USDT', 'UNI/USDT', 'ATOM/USDT',
    'ETC/USDT', 'XLM/USDT', 'ALGO/USDT', 'NEAR/USDT', 'FTM/USDT',
    'LAND/USDT', 'SAND/USDT', 'MANA/USDT', 'GALA/USDT', 'APE/USDT',
  ],
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div hidden={value !== index} {...other} style={{ flex: 1, overflow: 'hidden', width: '100%' }}>
      {value === index && <Box sx={{ p: 3, height: '100%', width: '100%', overflowY: 'auto', overflowX: 'auto' }}>{children}</Box>}
    </div>
  )
}

function AppComplete() {
  // Authentication state
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [apiKeysOpen, setApiKeysOpen] = useState(false)

  // Login/Register form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newApiKey, setNewApiKey] = useState({
    exchange: '',
    apiKey: '',
    apiSecret: '',
    apiMemo: '',
  })

  // Trading state
  const [tabValue, setTabValue] = useState(0)
  const [selectedExchange, setSelectedExchange] = useState(
    localStorage.getItem('selectedExchange') || 'bingx'
  )
  const [selectedPair, setSelectedPair] = useState(
    localStorage.getItem('selectedPair') || 'BTC/USDT'
  )
  const [ticker, setTicker] = useState<any>(null)
  const [dexPrice, setDexPrice] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [openOrders, setOpenOrders] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [availablePairs, setAvailablePairs] = useState<string[]>(TRADING_PAIRS.bingx)

  // Notifications
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as any })

  // Market Making State
  const [mmConfig, setMmConfig] = useState({
    spread: 0.5,
    totalAmount: 100,
    referenceSource: 'CEX',
  })

  // MM API Keys state (separate from trading API keys)
  const [mmApiKeys, setMmApiKeys] = useState<any[]>([])
  const [mmApiKeysOpen, setMmApiKeysOpen] = useState(false)
  const [newMmApiKey, setNewMmApiKey] = useState({
    exchange: '',
    apiKey: '',
    apiSecret: '',
    apiMemo: '',
  })

  // MM Sessions state
  const [mmSessions, setMmSessions] = useState<any[]>([])

  // Order Form State
  const [orderForm, setOrderForm] = useState({
    side: 'BUY',
    type: 'LIMIT',
    quantity: '',
    price: localStorage.getItem('lastPrice') || '',
  })

  // Save price to localStorage when it changes
  useEffect(() => {
    if (orderForm.price) {
      localStorage.setItem('lastPrice', orderForm.price)
    }
  }, [orderForm.price])

  // Set axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUserProfile()
      fetchApiKeys()
      fetchMmApiKeys()
    }
  }, [token])

  // Fetch trading pairs when exchange changes
  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const response = await axios.get(`http://localhost:8080/api/v1/trading/pairs?exchange=${selectedExchange}`)
        const pairSymbols = response.data.map((market: any) => market.symbol)
        setAvailablePairs(pairSymbols)
      } catch (error) {
        console.error('Failed to fetch trading pairs:', error)
        // Fallback to hardcoded pairs if API fails
        setAvailablePairs(TRADING_PAIRS[selectedExchange as keyof typeof TRADING_PAIRS] || TRADING_PAIRS.bingx)
      }
    }
    fetchPairs()
  }, [selectedExchange])

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/v1/user/profile')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  // Fetch API keys
  const fetchApiKeys = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/v1/user/api-keys')
      setApiKeys(response.data)
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }

  // Fetch market data
  const fetchMarketData = async () => {
    try {
      const tickerRes = await axios.get(`http://localhost:8080/api/v1/market/ticker?symbol=${selectedPair}&exchange=${selectedExchange}`)
      setTicker(tickerRes.data)
    } catch (error: any) {
      console.error('Error fetching ticker:', error)
      setTicker(null) // Clear ticker on error
      if (error.response?.data?.message) {
        setSnackbar({
          open: true,
          message: error.response.data.message,
          severity: 'error'
        })
      }
    }

    try {
      const dexRes = await axios.get('http://localhost:8080/api/v1/market/dex-price')
      setDexPrice(dexRes.data)
    } catch (error) {
      console.error('Error fetching DEX price:', error)
      // DEX price is optional, don't show error for this
    }
  }

  // Fetch orders
  const fetchOrders = async () => {
    if (!token) return

    // Check if we have API keys for the selected exchange
    if (!hasApiKeysForSelectedExchange()) {
      setOrders([]) // Clear orders if no API keys
      return
    }

    try {
      const response = await axios.get(`http://localhost:8080/api/v1/orders/history?exchange=${selectedExchange}`)
      setOrders(response.data)
    } catch (error: any) {
      console.error('Failed to fetch orders:', error)
      setOrders([]) // Clear orders on error
      // Show error notification
      if (error.response?.data?.error) {
        setSnackbar({
          open: true,
          message: error.response.data.error,
          severity: 'error'
        })
      }
    }
  }

  // Fetch balances
  const fetchBalances = async () => {
    if (!token) return

    // Check if we have API keys for the selected exchange
    if (!hasApiKeysForSelectedExchange()) {
      setBalances([]) // Clear balances if no API keys
      return
    }

    try {
      const response = await axios.get(`http://localhost:8080/api/v1/trading/balances?exchange=${selectedExchange}`)
      setBalances(response.data)
    } catch (error) {
      console.error('Failed to fetch balances:', error)
      setBalances([]) // Clear balances on error
    }
  }

  // Fetch open orders
  const fetchOpenOrders = async () => {
    if (!token) return

    // Check if we have API keys for the selected exchange
    if (!hasApiKeysForSelectedExchange()) {
      setOpenOrders([]) // Clear open orders if no API keys
      return
    }

    try {
      const response = await axios.get(`http://localhost:8080/api/v1/trading/open-orders?exchange=${selectedExchange}&symbol=${selectedPair}`)
      setOpenOrders(response.data)
    } catch (error) {
      console.error('Failed to fetch open orders:', error)
      setOpenOrders([])
    }
  }

  // Cancel order
  const handleCancelOrder = async (orderId: string) => {
    if (!token) return
    try {
      await axios.delete(`http://localhost:8080/api/v1/orders/${orderId}?exchange=${selectedExchange}&symbol=${selectedPair}`)
      setSnackbar({ open: true, message: 'Order cancelled successfully!', severity: 'success' })
      fetchOpenOrders() // Refresh open orders
      fetchOrders() // Refresh order history
      fetchBalances() // Refresh balances
    } catch (error: any) {
      console.error('Failed to cancel order:', error)
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to cancel order',
        severity: 'error'
      })
    }
  }

  // Cancel all orders
  const handleCancelAllOrders = async () => {
    if (!token || openOrders.length === 0) return

    const confirmCancel = window.confirm(`Are you sure you want to cancel all ${openOrders.length} open orders for ${selectedPair}?`)
    if (!confirmCancel) return

    setLoading(true)
    let successCount = 0
    let failCount = 0

    try {
      // Cancel all orders one by one
      for (const order of openOrders) {
        try {
          await axios.delete(`http://localhost:8080/api/v1/orders/${order.id}?exchange=${selectedExchange}&symbol=${selectedPair}`)
          successCount++
        } catch (error) {
          console.error(`Failed to cancel order ${order.id}:`, error)
          failCount++
        }
      }

      // Show result notification
      if (failCount === 0) {
        setSnackbar({ open: true, message: `Successfully cancelled all ${successCount} orders!`, severity: 'success' })
      } else if (successCount > 0) {
        setSnackbar({ open: true, message: `Cancelled ${successCount} orders, ${failCount} failed`, severity: 'warning' })
      } else {
        setSnackbar({ open: true, message: 'Failed to cancel all orders', severity: 'error' })
      }

      // Refresh data
      fetchOpenOrders()
      fetchOrders()
      fetchBalances()
    } catch (error) {
      console.error('Error in cancel all orders:', error)
      setSnackbar({ open: true, message: 'Error cancelling orders', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarketData()
    const interval = setInterval(fetchMarketData, 5000)
    return () => clearInterval(interval)
  }, [selectedExchange, selectedPair])

  // Fetch data based on active tab to prevent rate limiting
  useEffect(() => {
    if (!token) {
      // Clear all data when not logged in
      setOrders([])
      setBalances([])
      setOpenOrders([])
      return
    }

    // Only fetch data for the currently active tab
    if (tabValue === 0) {
      // Limit Orders tab - fetch open orders and balances
      fetchOpenOrders()
      fetchBalances()
    } else if (tabValue === 1) {
      // Market Making tab - fetch balances and MM sessions
      fetchBalances()
      fetchMmSessions()
    } else if (tabValue === 2) {
      // Order History tab - fetch order history only when tab is active
      fetchOrders()
    } else if (tabValue === 3) {
      // Balances tab - fetch balances only when tab is active
      fetchBalances()
    }
  }, [token, selectedExchange, selectedPair, tabValue, apiKeys])

  // Save selectedExchange to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedExchange', selectedExchange)
  }, [selectedExchange])

  // Save selectedPair to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedPair', selectedPair)
  }, [selectedPair])

  // Check if current exchange has API keys configured
  const hasApiKeysForSelectedExchange = () => {
    return apiKeys.some(key => key.exchange.toLowerCase() === selectedExchange.toLowerCase())
  }

  // Handle login
  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:8080/api/v1/auth/login', loginForm)
      setToken(response.data.token)
      localStorage.setItem('token', response.data.token)
      setUser(response.data.user)
      setLoginOpen(false)
      setSnackbar({ open: true, message: 'Login successful!', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Login failed', severity: 'error' })
    }
  }

  // Handle register
  const handleRegister = async () => {
    try {
      const response = await axios.post('http://localhost:8080/api/v1/auth/register', registerForm)
      setToken(response.data.token)
      localStorage.setItem('token', response.data.token)
      setUser(response.data.user)
      setRegisterOpen(false)
      setSnackbar({ open: true, message: 'Registration successful!', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Registration failed', severity: 'error' })
    }
  }

  // Handle logout
  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    setSnackbar({ open: true, message: 'Logged out successfully', severity: 'info' })
  }

  // Handle save API key
  const handleSaveApiKey = async () => {
    if (!newApiKey.exchange || !newApiKey.apiKey || !newApiKey.apiSecret) {
      setSnackbar({ open: true, message: 'Please fill all required fields', severity: 'warning' })
      return
    }

    try {
      await axios.post('http://localhost:8080/api/v1/user/api-keys', newApiKey)
      setSnackbar({ open: true, message: 'API key saved successfully!', severity: 'success' })
      fetchApiKeys()
      setNewApiKey({ exchange: '', apiKey: '', apiSecret: '', apiMemo: '' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to save API key', severity: 'error' })
    }
  }

  // Handle delete API key
  const handleDeleteApiKey = async (exchange: string) => {
    try {
      await axios.delete(`http://localhost:8080/api/v1/user/api-keys/${exchange}`)
      setSnackbar({ open: true, message: `API key for ${exchange} deleted successfully!`, severity: 'success' })
      fetchApiKeys()
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to delete API key', severity: 'error' })
    }
  }

  // Fetch MM API keys
  const fetchMmApiKeys = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/v1/mm/api-keys')
      setMmApiKeys(response.data)
    } catch (error) {
      console.error('Failed to fetch MM API keys:', error)
    }
  }

  // Fetch MM Sessions
  const fetchMmSessions = async () => {
    if (!token) return
    try {
      const response = await axios.get('http://localhost:8080/api/v1/market-making/sessions')
      setMmSessions(response.data)
    } catch (error) {
      console.error('Failed to fetch MM sessions:', error)
    }
  }

  // Check if current exchange has MM API keys configured
  const hasMmApiKeysForSelectedExchange = () => {
    return mmApiKeys.some(key => key.exchange.toLowerCase() === selectedExchange.toLowerCase())
  }

  // Handle save MM API key
  const handleSaveMmApiKey = async () => {
    if (!newMmApiKey.exchange || !newMmApiKey.apiKey || !newMmApiKey.apiSecret) {
      setSnackbar({ open: true, message: 'Please fill all required fields', severity: 'warning' })
      return
    }

    try {
      await axios.post('http://localhost:8080/api/v1/mm/api-keys', newMmApiKey)
      setSnackbar({ open: true, message: 'MM API key saved successfully!', severity: 'success' })
      fetchMmApiKeys()
      setNewMmApiKey({ exchange: '', apiKey: '', apiSecret: '', apiMemo: '' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to save MM API key', severity: 'error' })
    }
  }

  // Handle delete MM API key
  const handleDeleteMmApiKey = async (exchange: string) => {
    try {
      await axios.delete(`http://localhost:8080/api/v1/mm/api-keys/${exchange}`)
      setSnackbar({ open: true, message: `MM API key for ${exchange} deleted successfully!`, severity: 'success' })
      fetchMmApiKeys()
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to delete MM API key', severity: 'error' })
    }
  }

  // Handle place order
  const handlePlaceOrder = async () => {
    if (!token) {
      setSnackbar({ open: true, message: 'Please login to place orders', severity: 'warning' })
      return
    }

    // Check if API keys exist for the selected exchange
    if (!hasApiKeysForSelectedExchange()) {
      setSnackbar({
        open: true,
        message: `No API keys configured for ${selectedExchange.toUpperCase()}. Please add API keys to place orders.`,
        severity: 'warning'
      })
      return
    }

    if (!orderForm.quantity || !orderForm.price) {
      setSnackbar({ open: true, message: 'Please fill all order fields', severity: 'warning' })
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('http://localhost:8080/api/v1/orders/create', {
        exchange: selectedExchange,
        symbol: selectedPair,
        side: orderForm.side,
        type: orderForm.type,
        quantity: parseFloat(orderForm.quantity),
        price: parseFloat(orderForm.price),
      })

      setSnackbar({ open: true, message: 'Order placed successfully!', severity: 'success' })
      setOrderForm({ ...orderForm, quantity: '' })  // Keep price persistent
      fetchOrders()
      fetchOpenOrders()
      fetchBalances()
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to place order', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Handle market making
  const handleStartMarketMaking = async () => {
    if (!token) {
      setSnackbar({ open: true, message: 'Please login to start market making', severity: 'warning' })
      return
    }

    // Check if MM API keys exist for the selected exchange
    if (!hasMmApiKeysForSelectedExchange()) {
      setSnackbar({
        open: true,
        message: `No Market Making API keys configured for ${selectedExchange.toUpperCase()}. Please add MM API keys to start market making.`,
        severity: 'warning'
      })
      return
    }

    try {
      const response = await axios.post('http://localhost:8080/api/v1/market-making/start', {
        exchange: selectedExchange,
        symbol: selectedPair,
        spreadPercentage: mmConfig.spread,
        totalAmount: mmConfig.totalAmount,
        referenceSource: mmConfig.referenceSource,
      })

      setSnackbar({ open: true, message: `Market making started! Session ID: ${response.data.sessionId}`, severity: 'success' })
      // Refresh MM sessions to show the new session
      fetchMmSessions()
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to start market making', severity: 'error' })
    }
  }

  // Handle stop market making
  const handleStopMarketMaking = async (sessionId: string) => {
    try {
      await axios.post('http://localhost:8080/api/v1/market-making/stop', { sessionId })
      setSnackbar({ open: true, message: 'Market making stopped successfully!', severity: 'success' })
      // Refresh MM sessions
      fetchMmSessions()
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to stop market making', severity: 'error' })
    }
  }

  // Handle delete market making session
  const handleDeleteMarketMakingSession = async (sessionId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this market making session? This will remove all session data including order history.')
    if (!confirmDelete) return

    try {
      await axios.delete(`http://localhost:8080/api/v1/market-making/sessions/${sessionId}`)
      setSnackbar({ open: true, message: 'Session deleted successfully!', severity: 'success' })
      // Refresh MM sessions
      fetchMmSessions()
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to delete session', severity: 'error' })
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(price)
  }

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Calculate smart step based on the rightmost decimal place
  const getPriceStep = (price: string) => {
    if (!price || price === '') return '0.01'

    const decimalIndex = price.indexOf('.')
    if (decimalIndex === -1) return '1' // No decimal, step by 1

    const decimals = price.length - decimalIndex - 1
    if (decimals === 0) return '1'

    // Return step as 1 in the rightmost decimal place
    return '0.' + '0'.repeat(decimals - 1) + '1'
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', margin: 0, padding: 0 }}>
        {/* Header */}
        <AppBar position="static" sx={{ background: '#1a1a1a' }}>
          <Toolbar>
            <ShowChart sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Crypto Trading Platform
            </Typography>

            {/* User info */}
            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <AccountCircle sx={{ mr: 1 }} />
                <Typography>{user.username}</Typography>
              </Box>
            )}

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

            {/* Trading Pair Selector with Autocomplete */}
            <Autocomplete
              value={selectedPair}
              onChange={(_event, newValue) => {
                if (newValue) setSelectedPair(newValue)
              }}
              options={availablePairs}
              sx={{ width: 150, mx: 1 }}
              size="small"
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  sx={{
                    '& .MuiInputBase-input': { color: 'white' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  }}
                />
              )}
            />

            <IconButton color="inherit" onClick={fetchMarketData}>
              <Refresh />
            </IconButton>

            {/* API Keys button */}
            {user && (
              <IconButton color="inherit" onClick={() => setApiKeysOpen(true)}>
                <VpnKey />
              </IconButton>
            )}

            <IconButton color="inherit">
              <Settings />
            </IconButton>

            {/* Login/Logout */}
            {user ? (
              <IconButton color="inherit" onClick={handleLogout}>
                <LogoutIcon />
              </IconButton>
            ) : (
              <Button color="inherit" startIcon={<LoginIcon />} onClick={() => setLoginOpen(true)}>
                Login
              </Button>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth={false} sx={{ mt: 0, px: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Alert for non-logged in users */}
          {!user && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Please login to access full trading features, save API keys, and place orders.
              <Button size="small" onClick={() => setLoginOpen(true)} sx={{ ml: 2 }}>
                Login
              </Button>
              <Button size="small" onClick={() => setRegisterOpen(true)} sx={{ ml: 1 }}>
                Register
              </Button>
            </Alert>
          )}

          {/* Price Display Cards */}
          <Grid container spacing={2} sx={{ mb: 2, px: 2, pt: 2 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    CEX Price ({selectedExchange.toUpperCase()}) - {selectedPair}
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
                    DEX Price ({dexPrice?.symbol || 'LANDSHARE/USDT'})
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
          <Paper sx={{
            p: 2,
            flex: 1,
            mx: 2,
            mb: 2,
            width: 'calc(100% - 32px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
                    {!user && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Login required to place orders
                      </Alert>
                    )}
                    {user && !hasApiKeysForSelectedExchange() && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        No API keys configured for {selectedExchange.toUpperCase()}.
                        <Button size="small" onClick={() => setApiKeysOpen(true)} sx={{ ml: 1 }}>
                          Add API Keys
                        </Button>
                      </Alert>
                    )}
                    {user && hasApiKeysForSelectedExchange() && balances.length > 0 && (
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(0, 255, 136, 0.05)', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Available Balance
                        </Typography>
                        <Grid container spacing={1}>
                          {(() => {
                            const [base, quote] = selectedPair.split('/');
                            const baseBalance = balances.find(b => b.currency === base);
                            const quoteBalance = balances.find(b => b.currency === quote);
                            return (
                              <>
                                {baseBalance && (
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      <strong>{base}:</strong> {baseBalance.available.toFixed(8)}
                                    </Typography>
                                  </Grid>
                                )}
                                {quoteBalance && (
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      <strong>{quote}:</strong> {quoteBalance.available.toFixed(2)}
                                    </Typography>
                                  </Grid>
                                )}
                              </>
                            );
                          })()}
                        </Grid>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Button
                        fullWidth
                        variant={orderForm.side === 'BUY' ? 'contained' : 'outlined'}
                        onClick={() => setOrderForm({ ...orderForm, side: 'BUY' })}
                        disabled={!user}
                        sx={{
                          bgcolor: orderForm.side === 'BUY' ? '#00ff88' : 'transparent',
                          color: orderForm.side === 'BUY' ? '#000' : '#00ff88',
                          borderColor: '#00ff88',
                          '&:hover': {
                            bgcolor: orderForm.side === 'BUY' ? '#00dd77' : 'rgba(0, 255, 136, 0.1)',
                            borderColor: '#00ff88',
                          }
                        }}
                      >
                        Buy
                      </Button>
                      <Button
                        fullWidth
                        variant={orderForm.side === 'SELL' ? 'contained' : 'outlined'}
                        onClick={() => setOrderForm({ ...orderForm, side: 'SELL' })}
                        disabled={!user}
                        sx={{
                          bgcolor: orderForm.side === 'SELL' ? '#ff4444' : 'transparent',
                          color: orderForm.side === 'SELL' ? '#000' : '#ff4444',
                          borderColor: '#ff4444',
                          '&:hover': {
                            bgcolor: orderForm.side === 'SELL' ? '#dd3333' : 'rgba(255, 68, 68, 0.1)',
                            borderColor: '#ff4444',
                          }
                        }}
                      >
                        Sell
                      </Button>
                    </Box>
                    <TextField
                      fullWidth
                      label="Price"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                      sx={{ mb: 2 }}
                      type="number"
                      disabled={!user}
                      helperText={ticker ? `Current: ${formatPrice(ticker.lastPrice)}` : ''}
                      inputProps={{ step: getPriceStep(orderForm.price) }}
                    />
                    <TextField
                      fullWidth
                      label="Amount"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                      sx={{ mb: 2 }}
                      type="number"
                      disabled={!user}
                    />
                    <TextField
                      fullWidth
                      label="Total"
                      value={orderForm.price && orderForm.quantity ?
                        (parseFloat(orderForm.price) * parseFloat(orderForm.quantity)).toFixed(2) : ''}
                      sx={{ mb: 2 }}
                      disabled
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handlePlaceOrder}
                      disabled={!user || loading}
                      sx={{
                        bgcolor: orderForm.side === 'BUY' ? '#00ff88' : '#ff4444',
                        color: '#000',
                      }}
                    >
                      {loading ? <CircularProgress size={24} /> : `Place ${orderForm.side} Order`}
                    </Button>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Open Orders ({selectedPair})
                      </Typography>
                      {user && hasApiKeysForSelectedExchange() && openOrders.length > 0 && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteSweep />}
                          onClick={handleCancelAllOrders}
                          disabled={loading}
                        >
                          Cancel All
                        </Button>
                      )}
                    </Box>
                    {!user ? (
                      <Alert severity="info">Login to view your open orders</Alert>
                    ) : !hasApiKeysForSelectedExchange() ? (
                      <Alert severity="warning">
                        Add API keys for {selectedExchange.toUpperCase()} to view open orders
                      </Alert>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Side</TableCell>
                              <TableCell align="right">Price</TableCell>
                              <TableCell align="right">Qty</TableCell>
                              <TableCell align="right">Filled</TableCell>
                              <TableCell align="center">Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {openOrders.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  No open orders for {selectedPair}
                                </TableCell>
                              </TableRow>
                            ) : (
                              openOrders.map((order, index) => (
                                <TableRow
                                  key={index}
                                  sx={{
                                    bgcolor: order.side === 'SELL'
                                      ? 'rgba(255, 68, 68, 0.1)'
                                      : 'rgba(0, 255, 136, 0.1)'
                                  }}
                                >
                                  <TableCell>
                                    <Chip
                                      label={order.side}
                                      size="small"
                                      sx={{
                                        bgcolor: order.side === 'BUY' ? '#00ff88' : '#ff4444',
                                        color: '#000',
                                        fontWeight: 'bold'
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell align="right" sx={{
                                    color: order.side === 'SELL' ? '#ff4444' : '#00ff88',
                                    fontWeight: 'bold'
                                  }}>
                                    {formatPrice(order.price)}
                                  </TableCell>
                                  <TableCell align="right">{order.quantity}</TableCell>
                                  <TableCell align="right">
                                    {order.filled || 0} ({((order.filled || 0) / order.quantity * 100).toFixed(1)}%)
                                  </TableCell>
                                  <TableCell align="center">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleCancelOrder(order.id)}
                                      title="Cancel Order"
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Market Making Tab */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Market Making Configuration
                      </Typography>
                      {user && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VpnKey />}
                          onClick={() => setMmApiKeysOpen(true)}
                        >
                          MM API Keys
                        </Button>
                      )}
                    </Box>
                    {!user && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Login required for market making
                      </Alert>
                    )}
                    {user && !hasMmApiKeysForSelectedExchange() && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        No Market Making API keys configured for {selectedExchange.toUpperCase()}.
                        <Button size="small" onClick={() => setMmApiKeysOpen(true)} sx={{ ml: 1 }}>
                          Add MM API Keys
                        </Button>
                      </Alert>
                    )}
                    {user && hasApiKeysForSelectedExchange() && balances.length > 0 && (
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(0, 255, 136, 0.05)', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Available Balance
                        </Typography>
                        <Grid container spacing={1}>
                          {(() => {
                            const [base, quote] = selectedPair.split('/');
                            const baseBalance = balances.find(b => b.currency === base);
                            const quoteBalance = balances.find(b => b.currency === quote);
                            return (
                              <>
                                {baseBalance && (
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      <strong>{base}:</strong> {baseBalance.available.toFixed(8)}
                                    </Typography>
                                  </Grid>
                                )}
                                {quoteBalance && (
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      <strong>{quote}:</strong> {quoteBalance.available.toFixed(2)}
                                    </Typography>
                                  </Grid>
                                )}
                              </>
                            );
                          })()}
                        </Grid>
                      </Box>
                    )}
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
                      disabled={!user}
                      helperText="Percentage spread from mid price (reference price)"
                    />
                    <TextField
                      fullWidth
                      label="Total Amount (USDT)"
                      value={mmConfig.totalAmount}
                      onChange={(e) =>
                        setMmConfig({ ...mmConfig, totalAmount: parseFloat(e.target.value) })
                      }
                      sx={{ mb: 2 }}
                      type="number"
                      inputProps={{ step: 10, min: 10 }}
                      disabled={!user}
                      helperText="Total capital to deploy (split 50/50 between buy and sell)"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Reference Source</InputLabel>
                      <Select
                        value={mmConfig.referenceSource}
                        label="Reference Source"
                        onChange={(e) =>
                          setMmConfig({ ...mmConfig, referenceSource: e.target.value })
                        }
                        disabled={!user}
                      >
                        <MenuItem value="CEX">CEX Price</MenuItem>
                        <MenuItem value="DEX">DEX Price</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={handleStartMarketMaking}
                      disabled={!user}
                    >
                      Start Market Making
                    </Button>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Market Making Sessions
                      </Typography>
                      <IconButton color="primary" onClick={fetchMmSessions} title="Refresh Sessions">
                        <Refresh />
                      </IconButton>
                    </Box>
                    {!user ? (
                      <Alert severity="info">Login to view market making sessions</Alert>
                    ) : mmSessions.length === 0 ? (
                      <Alert severity="info">No market making sessions yet. Start one to see it here!</Alert>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Exchange</TableCell>
                              <TableCell>Pair</TableCell>
                              <TableCell>Spread</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>Reference</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align="center">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {mmSessions.map((session, index) => (
                              <TableRow key={index}>
                                <TableCell>{session.exchange.toUpperCase()}</TableCell>
                                <TableCell>{session.symbol}</TableCell>
                                <TableCell>{session.spread_percentage}%</TableCell>
                                <TableCell>${session.total_amount}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={session.reference_source || 'CEX'}
                                    size="small"
                                    color={session.reference_source === 'DEX' ? 'warning' : 'info'}
                                    sx={{
                                      fontWeight: 'bold',
                                      minWidth: '50px'
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={session.isActive ? 'Active' : session.status}
                                    size="small"
                                    color={session.isActive ? 'success' : session.status === 'stopped' ? 'default' : 'error'}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                    {(session.isActive || session.status === 'running') && (
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleStopMarketMaking(session.session_id)}
                                        title="Stop Market Making"
                                      >
                                        <Stop fontSize="small" />
                                      </IconButton>
                                    )}
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteMarketMakingSession(session.session_id)}
                                      title="Delete Session"
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Order History Tab */}
            <TabPanel value={tabValue} index={2}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Order History for {selectedExchange.toUpperCase()}
                  </Typography>
                  {user && hasApiKeysForSelectedExchange() && (
                    <IconButton
                      color="primary"
                      onClick={fetchOrders}
                      title="Refresh Order History"
                    >
                      <Refresh />
                    </IconButton>
                  )}
                </Box>
                {!user ? (
                  <Alert severity="info">Login to view your order history</Alert>
                ) : !hasApiKeysForSelectedExchange() ? (
                  <Alert severity="warning">
                    Add API keys for {selectedExchange.toUpperCase()} to view order history
                    <Button size="small" onClick={() => setApiKeysOpen(true)} sx={{ ml: 1 }}>
                      Add API Keys
                    </Button>
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Time</TableCell>
                          <TableCell>Pair</TableCell>
                          <TableCell>Side</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Filled</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center">
                              No order history found for {selectedExchange.toUpperCase()}
                            </TableCell>
                          </TableRow>
                        ) : (
                          orders.map((order, index) => (
                            <TableRow
                              key={index}
                              sx={{
                                bgcolor: order.side === 'SELL'
                                  ? 'rgba(255, 68, 68, 0.05)'
                                  : 'rgba(0, 255, 136, 0.05)'
                              }}
                            >
                              <TableCell>{new Date(order.created_at || order.timestamp).toLocaleString()}</TableCell>
                              <TableCell>{order.symbol}</TableCell>
                              <TableCell>
                                <Chip
                                  label={order.side}
                                  size="small"
                                  sx={{
                                    bgcolor: order.side === 'BUY' ? '#00ff88' : '#ff4444',
                                    color: '#000',
                                    fontWeight: 'bold'
                                  }}
                                />
                              </TableCell>
                              <TableCell>{order.type}</TableCell>
                              <TableCell align="right" sx={{
                                color: order.side === 'SELL' ? '#ff4444' : '#00ff88',
                                fontWeight: 'bold'
                              }}>
                                {formatPrice(order.price)}
                              </TableCell>
                              <TableCell align="right">{order.quantity}</TableCell>
                              <TableCell align="right">
                                {order.filled || order.quantity} ({(((order.filled || order.quantity) / order.quantity) * 100).toFixed(1)}%)
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={order.status}
                                  size="small"
                                  color={order.status === 'FILLED' || order.status === 'CLOSED' ? 'success' : order.status === 'OPEN' ? 'warning' : 'default'}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
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
                    {!user ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          Login to view balances
                        </TableCell>
                      </TableRow>
                    ) : balances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No balances available. Add API keys for {selectedExchange}
                        </TableCell>
                      </TableRow>
                    ) : (
                      balances.map((balance, index) => (
                        <TableRow key={index}>
                          <TableCell>{balance.currency}</TableCell>
                          <TableCell align="right">{balance.available.toFixed(8)}</TableCell>
                          <TableCell align="right">{balance.locked.toFixed(8)}</TableCell>
                          <TableCell align="right">{balance.total.toFixed(8)}</TableCell>
                          <TableCell align="right">
                            {balance.currency === 'USDT' ?
                              formatPrice(balance.total) :
                              '---'
                            }
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </Paper>
        </Container>
      </Box>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onClose={() => setLoginOpen(false)}>
        <DialogTitle>Login</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={loginForm.username}
            onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginOpen(false)}>Cancel</Button>
          <Button onClick={() => { setLoginOpen(false); setRegisterOpen(true) }}>Register</Button>
          <Button onClick={handleLogin} variant="contained">Login</Button>
        </DialogActions>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={registerOpen} onClose={() => setRegisterOpen(false)}>
        <DialogTitle>Register</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={registerForm.username}
            onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={registerForm.email}
            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={registerForm.password}
            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterOpen(false)}>Cancel</Button>
          <Button onClick={handleRegister} variant="contained">Register</Button>
        </DialogActions>
      </Dialog>

      {/* API Keys Dialog */}
      <Dialog open={apiKeysOpen} onClose={() => setApiKeysOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>API Keys Management</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Add your exchange API keys to enable real trading. Keep your keys secure!
          </Typography>

          {/* List existing keys */}
          <List>
            {apiKeys.length === 0 ? (
              <ListItem>
                <ListItemText primary="No API keys saved yet" secondary="Add your first exchange API key below" />
              </ListItem>
            ) : (
              apiKeys.map((key, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={key.exchange.toUpperCase()}
                    secondary={`Added: ${new Date(key.created_at).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteApiKey(key.exchange)}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>

          {/* Add new key form */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Add New API Key
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Exchange</InputLabel>
            <Select
              value={newApiKey.exchange}
              label="Exchange"
              onChange={(e) => setNewApiKey({ ...newApiKey, exchange: e.target.value })}
            >
              <MenuItem value="bingx">BingX</MenuItem>
              <MenuItem value="bitmart">BitMart</MenuItem>
              <MenuItem value="ascendx">AscendX</MenuItem>
              <MenuItem value="gateio">Gate.io</MenuItem>
              <MenuItem value="mexc">MEXC</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="API Key"
            value={newApiKey.apiKey}
            onChange={(e) => setNewApiKey({ ...newApiKey, apiKey: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="Enter your API key"
          />

          <TextField
            fullWidth
            label="API Secret"
            type="password"
            value={newApiKey.apiSecret}
            onChange={(e) => setNewApiKey({ ...newApiKey, apiSecret: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="Enter your API secret"
          />

          <TextField
            fullWidth
            label="API Memo/Passphrase (optional)"
            value={newApiKey.apiMemo}
            onChange={(e) => setNewApiKey({ ...newApiKey, apiMemo: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="Required for some exchanges like BitMart"
            helperText="Some exchanges require an additional passphrase or memo"
          />

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleSaveApiKey}
            fullWidth
          >
            Save API Key
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeysOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* MM API Keys Dialog */}
      <Dialog open={mmApiKeysOpen} onClose={() => setMmApiKeysOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Market Making API Keys Management</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Add your exchange API keys specifically for Market Making. These are separate from your trading API keys for security.
          </Typography>

          {/* List existing MM keys */}
          <List>
            {mmApiKeys.length === 0 ? (
              <ListItem>
                <ListItemText primary="No MM API keys saved yet" secondary="Add your first MM API key below" />
              </ListItem>
            ) : (
              mmApiKeys.map((key, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={key.exchange.toUpperCase()}
                    secondary={`Added: ${new Date(key.created_at).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteMmApiKey(key.exchange)}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>

          {/* Add new MM key form */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Add New MM API Key
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Exchange</InputLabel>
            <Select
              value={newMmApiKey.exchange}
              label="Exchange"
              onChange={(e) => setNewMmApiKey({ ...newMmApiKey, exchange: e.target.value })}
            >
              <MenuItem value="bingx">BingX</MenuItem>
              <MenuItem value="bitmart">BitMart</MenuItem>
              <MenuItem value="ascendx">AscendX</MenuItem>
              <MenuItem value="gateio">Gate.io</MenuItem>
              <MenuItem value="mexc">MEXC</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="API Key"
            value={newMmApiKey.apiKey}
            onChange={(e) => setNewMmApiKey({ ...newMmApiKey, apiKey: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="Enter your MM API key"
          />

          <TextField
            fullWidth
            label="API Secret"
            type="password"
            value={newMmApiKey.apiSecret}
            onChange={(e) => setNewMmApiKey({ ...newMmApiKey, apiSecret: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="Enter your MM API secret"
          />

          <TextField
            fullWidth
            label="API Memo/Passphrase (optional)"
            value={newMmApiKey.apiMemo}
            onChange={(e) => setNewMmApiKey({ ...newMmApiKey, apiMemo: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="Required for some exchanges like BitMart"
            helperText="Some exchanges require an additional passphrase or memo"
          />

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleSaveMmApiKey}
            fullWidth
          >
            Save MM API Key
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMmApiKeysOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  )
}

export default AppComplete