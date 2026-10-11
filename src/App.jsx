import { useEffect, useState } from 'react'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from '@firebase/auth'
import { firebaseAuth, firebaseConfigured } from './firebase'
import './App.css'

const demoLocations = {
  vijayawada: {
    name: 'Vijayawada, India',
    rainfall: '32.0',
    temperature: '30',
    feelsLike: '35',
    humidity: '78',
    wind: '13',
    risk: 'Moderate',
    riskScore: 54,
    description: 'Sample scenario for exploring the dashboard layout.',
    rainfallNote: 'Illustrative sample',
    factors: [
      { name: 'Rainfall intensity', value: 61, level: 'Elevated' },
      { name: 'Drainage capacity', value: 53, level: 'Unknown' },
      { name: 'River level', value: 38, level: 'Unknown' },
    ],
    alerts: [
      { type: 'rain', title: 'Sample rainfall advisory', area: 'Demo zone A', time: 'Sample time', tone: 'amber' },
      { type: 'water', title: 'Example community report', area: 'Demo zone B', time: 'Sample time', tone: 'blue' },
      { type: 'info', title: 'Illustrative river notice', area: 'Sample waterway', time: 'Sample time', tone: 'slate' },
    ],
  },
  mumbai: {
    name: 'Mumbai, India',
    rainfall: '38.4',
    temperature: '29',
    feelsLike: '34',
    humidity: '84',
    wind: '18',
    risk: 'Moderate',
    riskScore: 58,
    description: 'Some low-lying areas may experience waterlogging.',
    rainfallNote: 'Last 3 hours',
    factors: [
      { name: 'Rainfall intensity', value: 72, level: 'Elevated' },
      { name: 'Drainage capacity', value: 48, level: 'Fair' },
      { name: 'River level', value: 32, level: 'Normal' },
    ],
    alerts: [
      { type: 'rain', title: 'Heavy rainfall watch', area: 'Andheri East', time: '18 min ago', tone: 'amber' },
      { type: 'water', title: 'Waterlogging reported', area: 'Dadar West', time: '42 min ago', tone: 'blue' },
      { type: 'info', title: 'High tide advisory', area: 'Bandra waterfront', time: '1 hr ago', tone: 'slate' },
    ],
  },
  chennai: {
    name: 'Chennai, India',
    rainfall: '24.1',
    temperature: '31',
    feelsLike: '39',
    humidity: '76',
    wind: '14',
    risk: 'Low',
    riskScore: 29,
    description: 'Conditions look stable across monitored demo areas.',
    rainfallNote: 'Last 3 hours',
    factors: [
      { name: 'Rainfall intensity', value: 34, level: 'Low' },
      { name: 'Drainage capacity', value: 76, level: 'Good' },
      { name: 'River level', value: 22, level: 'Normal' },
    ],
    alerts: [
      { type: 'info', title: 'Light rain expected', area: 'Adyar', time: '35 min ago', tone: 'blue' },
      { type: 'water', title: 'Drain inspection complete', area: 'Velachery', time: '2 hrs ago', tone: 'slate' },
    ],
  },
  bengaluru: {
    name: 'Bengaluru, India',
    rainfall: '16.8',
    temperature: '24',
    feelsLike: '25',
    humidity: '68',
    wind: '11',
    risk: 'Low',
    riskScore: 22,
    description: 'No elevated flood indicators in this sample.',
    rainfallNote: 'Last 3 hours',
    factors: [
      { name: 'Rainfall intensity', value: 25, level: 'Low' },
      { name: 'Drainage capacity', value: 81, level: 'Good' },
      { name: 'River level', value: 18, level: 'Normal' },
    ],
    alerts: [],
  },
  delhi: {
    name: 'New Delhi, India',
    rainfall: '8.2',
    temperature: '32',
    feelsLike: '33',
    humidity: '54',
    wind: '9',
    risk: 'Low',
    riskScore: 18,
    description: 'No elevated flood indicators in this sample.',
    rainfallNote: 'Last 3 hours',
    factors: [
      { name: 'Rainfall intensity', value: 16, level: 'Low' },
      { name: 'Drainage capacity', value: 79, level: 'Good' },
      { name: 'River level', value: 24, level: 'Normal' },
    ],
    alerts: [],
  },
}

function Icon({ name, size = 20, strokeWidth = 1.8 }) {
  const shared = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  const icons = {
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.7L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    arrow: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    chevron: <><path d="m9 18 6-6-6-6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    cloud: <><path d="M20 16.2A4.5 4.5 0 0 0 18 7.5 6 6 0 0 0 6.2 9 4 4 0 0 0 6 17h13" /><path d="M8 20v-2M12 20v-2M16 20v-2" /></>,
    droplets: <><path d="M12 3s-6 6.2-6 11a6 6 0 0 0 12 0c0-4.8-6-11-6-11Z" /><path d="M9 15a3 3 0 0 0 3 3" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    humidity: <><path d="M12 3s-6 6.4-6 11a6 6 0 0 0 12 0c0-4.6-6-11-6-11Z" /><path d="M9 15a3 3 0 0 0 3 3" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3-.5" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    rain: <><path d="M20 16.2A4.5 4.5 0 0 0 18 7.5 6 6 0 0 0 6.2 9 4 4 0 0 0 6 17h13" /><path d="m8 20 1-2M12 20l1-2M16 20l1-2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    settings: <><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.9Z" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    thermometer: <><path d="M14 14.8V5a3 3 0 0 0-6 0v9.8a5 5 0 1 0 6 0Z" /><path d="M11 11v6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    wind: <><path d="M3 8h12a3 3 0 1 0-3-3" /><path d="M2 12h17a3 3 0 1 1-3 3" /><path d="M4 16h5a3 3 0 1 1-3 3" /></>,
  }

  return <svg {...shared}>{icons[name] || icons.activity}</svg>
}

function getRouteFromHash() {
  const route = window.location.hash.replace(/^#\/?/, '')
  if (route === 'login' || route === 'signup' || route === 'dashboard' || route === 'landing') return route
  return route ? 'dashboard' : 'landing'
}

function getFirebaseErrorMessage(error) {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'An account already uses this email. Try signing in instead.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect. Check your details and try again.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/weak-password':
      return 'Firebase rejected this password. Use at least 8 characters and try a stronger one.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a little and try again.'
    case 'auth/network-request-failed':
      return 'Could not reach Firebase. Check your internet connection and try again.'
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is disabled. Enable it in Firebase Authentication settings.'
    default:
      return 'Firebase could not complete that request. Check your Firebase setup and try again.'
  }
}

function App() {
  const [route, setRoute] = useState(getRouteFromHash)
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(!firebaseAuth)
  const [authStatusError, setAuthStatusError] = useState('')

  useEffect(() => {
    const syncRoute = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    if (!firebaseAuth) return undefined

    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
      setAuthStatusError('')
    }, (error) => {
      console.error('Firebase authentication state could not be loaded.', error)
      setAuthStatusError('Could not check your sign-in status. Refresh the page or try again.')
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    if (!authReady || !user || (route !== 'login' && route !== 'signup')) return
    window.location.hash = '/dashboard'
    window.scrollTo(0, 0)
  }, [authReady, route, user])

  function navigate(nextRoute) {
    window.location.hash = nextRoute === 'landing' ? '/' : `/${nextRoute}`
    setRoute(nextRoute)
    window.scrollTo(0, 0)
  }

  async function handleLogout() {
    if (firebaseAuth && user) {
      try {
        await signOut(firebaseAuth)
      } catch (error) {
        console.error('Firebase sign-out failed.', error)
        setAuthStatusError('Could not sign out. Check your connection and try again.')
        return
      }
    }
    setAuthStatusError('')
    navigate('landing')
  }

  if (route === 'login') return <AuthPage key="login" mode="login" navigate={navigate} authStatusError={authStatusError} />
  if (route === 'signup') return <AuthPage key="signup" mode="signup" navigate={navigate} authStatusError={authStatusError} />
  if (route === 'dashboard') return <Dashboard onLogout={handleLogout} user={user} authStatusError={authStatusError} />
  return <LandingPage navigate={navigate} />
}

function FloodIllustration() {
  return (
    <svg className="landing-illustration" viewBox="0 0 620 470" role="img" aria-label="Illustration of a protected city surrounded by rainfall and water">
      <defs>
        <linearGradient id="illustration-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#0e528e" />
          <stop offset=".55" stopColor="#087d9c" />
          <stop offset="1" stopColor="#13a99f" />
        </linearGradient>
        <linearGradient id="water-fill" x1="0" x2="1">
          <stop offset="0" stopColor="#79e3ef" />
          <stop offset="1" stopColor="#36bdd4" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="18" y="18" width="584" height="434" rx="32" fill="url(#illustration-bg)" />
      <circle cx="110" cy="103" r="78" fill="none" stroke="#d2f4ff" strokeOpacity=".16" />
      <circle cx="504" cy="333" r="91" fill="none" stroke="#d2f4ff" strokeOpacity=".13" />
      <g fill="#d9f7ff" opacity=".48">
        <circle cx="443" cy="83" r="3" /><circle cx="463" cy="83" r="3" /><circle cx="483" cy="83" r="3" /><circle cx="503" cy="83" r="3" />
        <circle cx="443" cy="103" r="3" /><circle cx="463" cy="103" r="3" /><circle cx="483" cy="103" r="3" /><circle cx="503" cy="103" r="3" />
        <circle cx="443" cy="123" r="3" /><circle cx="463" cy="123" r="3" /><circle cx="483" cy="123" r="3" /><circle cx="503" cy="123" r="3" />
      </g>
      <g fill="#c7f1fb" opacity=".78">
        <path d="M126 157a41 41 0 0 1 78-13 29 29 0 0 1 9 57h-93a22 22 0 0 1 6-44Z" />
        <path d="m154 214-9 23m38-23-9 23m38-23-9 23" stroke="#d8f8ff" strokeWidth="7" strokeLinecap="round" />
        <path d="M394 176a34 34 0 0 1 65-11 24 24 0 0 1 8 47h-77a18 18 0 0 1 4-36Z" opacity=".7" />
        <path d="m414 222-7 18m30-18-7 18m30-18-7 18" stroke="#d8f8ff" strokeWidth="6" strokeLinecap="round" />
      </g>
      <g fill="#123e6c" opacity=".72">
        <path d="M68 324h53v83H68zM78 297h34v27H78zM133 294h58v113h-58zM146 265h31v29h-31zM204 315h48v92h-48zM261 277h59v130h-59zM273 247h34v30h-34zM328 303h49v104h-49zM386 287h61v120h-61zM400 257h33v30h-33zM458 319h86v88h-86z" />
      </g>
      <g fill="#c2eff8" opacity=".8">
        <path d="M85 341h7v12h-7zM101 341h7v12h-7zM148 313h8v12h-8zM169 313h8v12h-8zM274 299h8v13h-8zM298 299h8v13h-8zM400 311h8v13h-8zM426 311h8v13h-8zM481 339h8v12h-8zM510 339h8v12h-8z" />
      </g>
      <path d="M42 405c40-20 64 18 105 0s66 16 108 0 71 18 111 0 70 18 109 0 66 17 103 0" fill="none" stroke="url(#water-fill)" strokeWidth="12" strokeLinecap="round" />
      <path d="M42 426c40-20 64 18 105 0s66 16 108 0 71 18 111 0 70 18 109 0 66 17 103 0" fill="none" stroke="#87ebf1" strokeOpacity=".62" strokeWidth="5" strokeLinecap="round" />
      <g filter="url(#glow)" transform="translate(271 190)">
        <path d="M39 0 76 14v35c0 29-18 50-37 61C20 99 2 78 2 49V14L39 0Z" fill="#f7fdff" />
        <path d="M39 13 65 23v26c0 20-12 36-26 45-14-9-26-25-26-45V23l26-10Z" fill="#1d91c5" />
        <path d="M39 22s-17 19-17 32a17 17 0 0 0 34 0c0-13-17-32-17-32Z" fill="#a7f1f4" />
      </g>
      <g fill="#e5faff" opacity=".9">
        <circle cx="243" cy="155" r="3" /><circle cx="371" cy="264" r="3" /><circle cx="221" cy="278" r="2.5" />
        <circle cx="362" cy="143" r="2.5" /><circle cx="470" cy="245" r="3" /><circle cx="155" cy="259" r="2.5" />
      </g>
    </svg>
  )
}

function Brand({ light = false }) {
  return (
    <span className={`auth-brand ${light ? 'auth-brand-light' : ''}`}>
      <span className="auth-brand-mark"><Icon name="droplets" size={20} strokeWidth={2.2} /></span>
      <span><strong>FloodGuard <em>AI</em></strong><small>Smarter Data. Safer Tomorrow.</small></span>
    </span>
  )
}

function LandingPage({ navigate }) {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="brand-link" href="#/" aria-label="FloodGuard AI home"><Brand /></a>
        <nav className="landing-nav" aria-label="Landing page navigation">
          <a href="#features" onClick={(event) => {
            event.preventDefault()
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
          }}>How it works</a>
          <button className="landing-signin" type="button" onClick={() => navigate('login')}>Sign in</button>
          <button className="button-primary landing-get-started" type="button" onClick={() => navigate('signup')}>Get started</button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-kicker"><i /> COMMUNITY FLOOD AWARENESS</span>
          <h1>See the risk.<br /><span>Protect what matters.</span></h1>
          <p className="landing-description">FloodGuard AI is a flood and urban waterlogging monitoring concept designed to bring weather, terrain, and community information together in one clear view.</p>
          <div className="landing-cta">
            <button className="button-primary" type="button" onClick={() => navigate('signup')}>Get started <Icon name="arrow" size={16} /></button>
            <button className="button-secondary" type="button" onClick={() => navigate('login')}>Sign in</button>
          </div>
          <button className="landing-demo-link" type="button" onClick={() => navigate('dashboard')}>Explore the demo dashboard <Icon name="chevron" size={14} /></button>
          <div className="landing-trust"><span><Icon name="shield" size={15} /></span><p><strong>Built for clearer decisions</strong><small>Transparent information, with demo data clearly identified.</small></p></div>
        </div>
        <div className="landing-visual">
          <FloodIllustration />
          <div className="visual-caption"><span className="caption-dot" /><span><strong>FloodGuard AI</strong><small>Community-first monitoring concept</small></span><Icon name="arrow" size={16} /></div>
          <span className="visual-decoration visual-decoration-one" />
          <span className="visual-decoration visual-decoration-two" />
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="feature-heading"><span>ONE CLEARER VIEW</span><h2>Understand your surroundings</h2><p>Designed to bring important flood-related context closer to the people who need it.</p></div>
        <div className="feature-cards">
          <article><span><Icon name="rain" size={19} /></span><strong>Weather context</strong><p>Bring rainfall and weather observations into a simple, readable view.</p></article>
          <article><span><Icon name="map" size={19} /></span><strong>Area awareness</strong><p>Explore locations and community updates in a focused dashboard.</p></article>
          <article><span><Icon name="activity" size={19} /></span><strong>Risk indicators</strong><p>Keep sample indicators distinct from measured facts and real forecasts.</p></article>
        </div>
      </section>

      <footer className="landing-footer"><Brand /><span>Hackathon prototype · Flood data shown in the dashboard is illustrative demo content.</span></footer>
    </main>
  )
}

function AuthPage({ mode, navigate, authStatusError }) {
  const isSignup = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const form = event.currentTarget
    const formData = new FormData(form)
    const identity = String(formData.get('identity') || '').trim()
    const password = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')
    const remember = formData.get('remember') === 'on'

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)
    const validUsername = /^[A-Za-z0-9._-]{3,30}$/.test(identity)

    if (!identity) {
      setError(isSignup ? 'Enter your email address.' : 'Enter your email address or username.')
      return
    }
    if (isSignup ? !validEmail : !(validEmail || validUsername)) {
      setError(isSignup ? 'Enter a valid email address, such as name@example.com.' : 'Use a valid email address or username with 3–30 letters, numbers, dots, underscores, or hyphens.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    if (isSignup && password !== confirmPassword) {
      setError('Those passwords do not match. Check them and try again.')
      return
    }

    if (!firebaseAuth) {
      setError('Firebase is not configured. Follow the setup instructions in README.md to connect your Firebase project.')
      return
    }

    setSubmitting(true)
    try {
      if (isSignup) {
        await setPersistence(firebaseAuth, browserLocalPersistence)
        await createUserWithEmailAndPassword(firebaseAuth, identity, password)
      } else {
        await setPersistence(firebaseAuth, remember ? browserLocalPersistence : browserSessionPersistence)
        await signInWithEmailAndPassword(firebaseAuth, identity, password)
      }
      navigate('dashboard')
    } catch (authError) {
      console.error('Firebase authentication request failed.', authError)
      setError(getFirebaseErrorMessage(authError))
    } finally {
      setSubmitting(false)
      form.reset()
      setShowPassword(false)
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const email = event.currentTarget.form.elements.identity.value.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter your valid email address above first. Firebase will send a password reset link to that address.')
      return
    }
    if (!firebaseAuth) {
      setError('Firebase is not configured. Follow the setup instructions in README.md to enable password recovery.')
      return
    }

    try {
      await sendPasswordResetEmail(firebaseAuth, email)
      setSuccess('If an account exists for that email, Firebase will send a password reset link.')
    } catch (authError) {
      console.error('Firebase password reset request failed.', authError)
      setError(authError.code === 'auth/invalid-email'
        ? 'Enter a valid email address.'
        : 'Firebase could not send a reset link. Check your connection and Firebase settings, then try again.')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-art-panel">
        <a className="brand-link" href="#/" onClick={(event) => { event.preventDefault(); navigate('landing') }} aria-label="FloodGuard AI home"><Brand light /></a>
        <div className="auth-art-content">
          <span className="auth-kicker">{isSignup ? 'COMMUNITY FLOOD AWARENESS' : 'SMARTER FLOOD INTELLIGENCE'}</span>
          <h1>{isSignup ? <>Be ready.<br />Stay informed.</> : <>FloodGuard <span>AI</span></>}</h1>
          <p>{isSignup ? 'Create your workspace to explore a clearer view of weather and waterlogging information.' : 'AI-Powered Flood Risk Monitoring & Urban Waterlogging Intelligence.'}</p>
          <FloodIllustration />
          <div className="auth-art-points"><span><Icon name="shield" size={15} /> {isSignup ? 'Safety-minded' : 'Risk Monitoring'}</span><span><Icon name="activity" size={15} /> {isSignup ? 'Data-aware' : 'AI Analytics'}</span><span><Icon name="map" size={15} /> {isSignup ? 'Community-first' : 'Early Warnings'}</span></div>
        </div>
        <div className="auth-art-footer">FloodGuard AI <span>·</span> Smarter Data. Safer Tomorrow.</div>
      </section>

      <section className="auth-form-panel">
        <a className="auth-mobile-brand brand-link" href="#/" onClick={(event) => { event.preventDefault(); navigate('landing') }}><Brand /></a>
        <div className="auth-form-wrap">
          <span className={`prototype-label ${firebaseConfigured ? 'configured' : ''}`}><i /> {firebaseConfigured ? 'FIREBASE CONFIGURED' : 'FIREBASE SETUP REQUIRED'}</span>
          <h2>{isSignup ? 'Create your account' : 'Welcome Back'}</h2>
          <p className="auth-subtitle">{isSignup ? 'Get started with your FloodGuard AI workspace.' : 'Sign in to your FloodGuard AI dashboard.'}</p>
          <div className="auth-config-notice"><Icon name="info" size={16} /><span>{firebaseConfigured ? 'Firebase settings are present. Enable Email/Password sign-in in your Firebase console. Passwords are never saved by this app.' : 'Add your Firebase web app settings and enable Email/Password sign-in to use these forms.'}</span></div>
          {authStatusError && <div className="auth-error" role="alert"><Icon name="alert" size={16} /><span>{authStatusError}</span></div>}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="auth-identity">Email address</label>
            <div className="auth-input-wrap">
              <Icon name="mail" size={16} />
              <input id="auth-identity" name="identity" type="email" autoComplete="email" placeholder="you@example.com" />
            </div>
            <div className="password-label-row"><label htmlFor="auth-password">Password</label>{!isSignup && <span>At least 8 characters</span>}</div>
            <div className="password-input-wrap">
              <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="Enter your password" />
              <span className="password-field-icon"><Icon name="shield" size={16} /></span>
              <button type="button" className="password-toggle" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} /></button>
            </div>
            {isSignup && <><label htmlFor="auth-confirm-password">Confirm password</label><div className="password-input-wrap"><input id="auth-confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" /><span className="password-field-icon"><Icon name="shield" size={16} /></span><button type="button" className="password-toggle" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} /></button></div></>}
            {!isSignup && <div className="auth-options"><label className="remember-option"><input type="checkbox" name="remember" /> <span>Remember me</span></label><button className="forgot-link" type="button" onClick={handleForgotPassword}>Forgot password?</button></div>}
            {error && <div className="auth-error" role="alert"><Icon name="alert" size={16} /><span>{error}</span></div>}
            {success && <div className="auth-success" role="status"><Icon name="check" size={16} /><span>{success}</span></div>}
            <button className="button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Connecting securely…' : isSignup ? 'Create account' : 'Sign in'} {!submitting && <Icon name="chevron" size={16} />}</button>
          </form>
          <p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to FloodGuard AI?'} <button type="button" onClick={() => navigate(isSignup ? 'login' : 'signup')}>{isSignup ? 'Sign in' : 'Create an account'}</button></p>
          <div className="auth-divider"><span>OR</span></div>
          <button className="button-secondary auth-demo-button" type="button" onClick={() => navigate('dashboard')}><Icon name="map" size={17} /> Continue to demo dashboard</button>
          <p className="auth-demo-note">Demo flood readings and risk indicators are illustrative only, not real-time predictions.</p>
        </div>
        <footer className="auth-footer"><span>© {new Date().getFullYear()} FloodGuard AI · Passwords are processed by Firebase Authentication.</span><a href="#/" onClick={(event) => { event.preventDefault(); navigate('landing') }}>Back to home</a></footer>
      </section>
    </main>
  )
}

function Dashboard({ onLogout, user, authStatusError }) {
  const [location, setLocation] = useState(demoLocations.vijayawada)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const isEmpty = location === null

  function handleSearch(event) {
    event.preventDefault()
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      setError('Enter a city name to search the demo locations.')
      return
    }

    setError('')
    setLoading(true)

    window.setTimeout(() => {
      const match = Object.values(demoLocations).find(
        (item) => item.name.toLowerCase().includes(normalizedQuery),
      )
      setLocation(match || null)
      setLoading(false)
    }, 450)
  }

  function chooseDemoCity(city) {
    setQuery(city)
    setError('')
  }

  function selectSection(section) {
    setActiveSection(section)
    setMobileNavOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" onClick={() => selectSection('overview')}>
          <span className="brand-mark"><Icon name="activity" size={21} strokeWidth={2.2} /></span>
          <span className="brand-copy">
            <strong>FloodGuard<span> AI</span></strong>
            <small>URBAN WATER WATCH</small>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <a className={`nav-link ${activeSection === 'overview' ? 'active' : ''}`} href="#overview" onClick={() => selectSection('overview')}>
            <Icon name="grid" size={18} /> <span>Dashboard</span>
          </a>
          <a className={`nav-link ${activeSection === 'map' ? 'active' : ''}`} href="#map" onClick={() => selectSection('map')}>
            <Icon name="map" size={18} /> <span>Map</span>
          </a>
          <a className={`nav-link ${activeSection === 'alerts' ? 'active' : ''}`} href="#alerts" onClick={() => selectSection('alerts')}>
            <Icon name="bell" size={18} /> <span>Alerts</span>
            <span className="nav-count">{location?.alerts.length || 0}</span>
          </a>
          <a className="nav-link" href="#reports" onClick={() => selectSection('reports')}>
            <Icon name="file" size={18} /> <span>Reports</span>
          </a>
          <a className="nav-link" href="#settings" onClick={() => selectSection('settings')}>
            <Icon name="settings" size={18} /> <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="demo-note">
            <span className="demo-note-icon"><Icon name="shield" size={17} /></span>
            <strong>Demo environment</strong>
            <p>Sample information only. No live monitoring is connected.</p>
          </div>
          <div className="profile">
            <div className="profile-avatar">FG</div>
            <div className="profile-copy"><strong>{user?.email || 'FloodGuard team'}</strong><span>{user ? 'Signed in with Firebase' : 'Community workspace'}</span></div>
            <button className="icon-button profile-more" aria-label="Log out" title="Log out" onClick={onLogout}><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-panel">
        {authStatusError && <div className="auth-error dashboard-auth-error" role="alert"><Icon name="alert" size={16} /><span>{authStatusError}</span></div>}
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
            <Icon name="menu" size={20} />
          </button>
          <form className="location-search topbar-search" onSubmit={handleSearch} noValidate>
            <Icon name="search" size={17} />
            <label className="sr-only" htmlFor="location-search">Search a demo city</label>
            <input
              id="location-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                if (error) setError('')
              }}
              placeholder="Search a demo city (e.g. Mumbai)"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'search-error' : 'search-hint'}
            />
            <button type="submit" aria-label={loading ? 'Searching demo locations' : 'Search demo locations'} disabled={loading}><Icon name="search" size={16} /></button>
          </form>
          <div className="topbar-actions">
            {!isEmpty && <div className="header-weather"><span className="header-weather-icon"><Icon name="sun" size={21} /></span><span><strong>{location.temperature}°C</strong><small>Sample weather</small></span></div>}
            <span className="demo-pill"><span className="status-dot" /> DEMO DATA</span>
            <button className="icon-button notification-button" aria-label="Notifications">
              <Icon name="bell" size={19} /><i />
            </button>
            <div className="top-user"><div className="top-avatar" aria-label={user ? 'Signed-in user' : 'Demo user'}>FG</div><span>{user?.email || 'Demo workspace'}</span><button className="dashboard-logout" type="button" onClick={onLogout}><Icon name="logout" size={14} /> Log out</button></div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> CITY MONITORING · DEMO</div>
              <h1>Welcome to FloodGuard AI</h1>
              <p className="welcome-subtitle">Explore sample flood and urban waterlogging indicators.</p>
            </div>
            <div className="welcome-actions">
              <div className="selected-location"><Icon name="location" size={16} /><span>{isEmpty ? 'No demo location' : location.name}</span><Icon name="chevron" size={13} /></div>
              <div className="date-chip"><Icon name="clock" size={16} /> <span>Sample data</span></div>
            </div>
          </section>

          <section className="search-row" aria-label="Location search status">
            <p className="search-hint" id={error ? 'search-error' : 'search-hint'}>
              {error ? <span className="error-text" role="alert">{error}</span> : <>Search demo locations: <button type="button" onClick={() => chooseDemoCity('Vijayawada')}>Vijayawada</button>, <button type="button" onClick={() => chooseDemoCity('Mumbai')}>Mumbai</button>, <button type="button" onClick={() => chooseDemoCity('Chennai')}>Chennai</button>, <button type="button" onClick={() => chooseDemoCity('Bengaluru')}>Bengaluru</button></>}
            </p>
          </section>

          <div className="current-location">
            <span className="location-pin"><Icon name="location" size={16} /></span>
            <strong>{isEmpty ? 'No matching demo location' : location.name}</strong>
            <span className="location-separator">·</span>
            <span>{isEmpty ? 'Search another city to continue' : 'Sample conditions · not live'}</span>
            <span className="sample-tag"><span /> SAMPLE</span>
          </div>

          <section className="metrics-grid" aria-label="Weather information">
            <MetricCard
              title="Rainfall"
              icon="rain"
              iconClass="metric-icon-blue"
              value={loading || isEmpty ? '—' : location.rainfall}
              unit={loading || isEmpty ? '' : 'mm'}
              detail={loading ? 'Loading demo data…' : isEmpty ? 'No sample available' : location.rainfallNote}
              visual="rain-chart"
              loading={loading}
            />
            <MetricCard
              title="Temperature"
              icon="thermometer"
              iconClass="metric-icon-orange"
              value={loading || isEmpty ? '—' : location.temperature}
              unit={loading || isEmpty ? '' : '°C'}
              detail={loading ? 'Loading demo data…' : isEmpty ? 'No sample available' : `Feels like ${location.feelsLike}°`}
              visual="temperature-chart"
              loading={loading}
            />
            <MetricCard
              title="Humidity"
              icon="humidity"
              iconClass="metric-icon-violet"
              value={loading || isEmpty ? '—' : location.humidity}
              unit={loading || isEmpty ? '' : '%'}
              detail={loading ? 'Loading demo data…' : isEmpty ? 'No sample available' : 'High moisture'}
              visual="humidity-chart"
              loading={loading}
            />
            <MetricCard
              title="Wind speed"
              icon="wind"
              iconClass="metric-icon-green"
              value={loading || isEmpty ? '—' : location.wind}
              unit={loading || isEmpty ? '' : 'km/h'}
              detail={loading ? 'Loading demo data…' : isEmpty ? 'No sample available' : 'Light breeze'}
              visual="wind-chart"
              loading={loading}
            />
          </section>

          <section className="dashboard-grid" id="overview">
            <article className="panel map-panel" id="map">
              <PanelHeading title="Flood risk map" subtitle="Illustrative area view · no live map data">
                <div className="map-heading-key"><span><i className="key-low" /> Low</span><span><i className="key-moderate" /> Moderate</span><span><i className="key-high" /> High</span></div>
              </PanelHeading>
              {loading ? <LoadingState label="Loading demo map…" /> : isEmpty ? <EmptyState icon="map" title="Map preview unavailable" detail="No sample map is available for this search." /> : (
                <>
                  <div className="map-illustration" role="img" aria-label={`Illustrative demo risk map for ${location.name}`}>
                    <svg className="map-lines" viewBox="0 0 600 310" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                      <rect width="600" height="310" fill="#eaf3f4" />
                      <path d="M-30 43 100 76 177 45l86 30 95-18 87 42 95-33 93 19M-15 121l106-14 78 34 95-23 105 34 103-31 111 30M-14 223l122-43 83 31 99-44 90 38 101-43 117 23M57-17l31 73-23 76 49 77-21 113M191-11l-8 65 41 82-38 79 22 112M343-22l-27 68 52 71-32 85 38 105M489-17l-31 88 51 55-19 67 37 105" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M-30 43 100 76 177 45l86 30 95-18 87 42 95-33 93 19M-15 121l106-14 78 34 95-23 105 34 103-31 111 30M-14 223l122-43 83 31 99-44 90 38 101-43 117 23M57-17l31 73-23 76 49 77-21 113M191-11l-8 65 41 82-38 79 22 112M343-22l-27 68 52 71-32 85 38 105M489-17l-31 88 51 55-19 67 37 105" fill="none" stroke="#d6e2e3" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M49 202c46-42 63-28 103-54s59-4 89-31 43-5 73-19 53 7 76-16 53-9 80-39 60-2 93-23" fill="none" stroke="#79c9d6" strokeWidth="7" strokeLinecap="round" opacity=".9" />
                      <path d="M167 75c35 1 52 19 59 45s-1 42-23 53-48 5-60-15-7-55 24-83Z" fill="#f6b660" opacity=".28" />
                      <path d="M365 173c26-28 62-25 83-8s29 43 13 66-50 31-77 18-42-48-19-76Z" fill="#ec876b" opacity=".25" />
                      <path d="M170 91c23-18 47-6 53 13 8 24-6 40-28 43s-38-11-35-30c1-11 3-18 10-26ZM388 181c18-14 41-6 46 11 7 20-7 35-26 35s-32-12-27-29c1-7 3-12 7-17Z" fill="#f0a448" opacity=".42" />
                      <circle cx="201" cy="125" r="7" fill="#fff" stroke="#e59639" strokeWidth="3" />
                      <circle cx="412" cy="204" r="7" fill="#fff" stroke="#e87559" strokeWidth="3" />
                      <circle cx="320" cy="96" r="5" fill="#fff" stroke="#55abc0" strokeWidth="2.5" />
                    </svg>
                    <span className="map-label label-one"><i /> Demo zone A</span>
                    <span className="map-label label-two"><i /> Demo zone B</span>
                    <span className="map-label label-three"><i /> Sample waterway</span>
                    <div className="map-stamp"><Icon name="location" size={13} /> DEMO MAP</div>
                  </div>
                  <div className="map-footnote"><Icon name="info" size={15} /><span>Zones are illustrative and do not represent live conditions.</span></div>
                </>
              )}
            </article>

            <article className="panel risk-panel">
              <PanelHeading title="Flood risk overview" subtitle="A demo indicator based on sample conditions">
                <span className="info-tag"><Icon name="activity" size={13} /> DEMO</span>
              </PanelHeading>
              {loading ? <LoadingState label="Loading sample risk overview…" /> : isEmpty ? <EmptyState icon="map" title="No demo risk data" detail="Choose one of the sample cities above to view its risk overview." /> : (
                <>
                  <div className="risk-summary">
                    <div className={`risk-meter risk-${location.risk.toLowerCase()}`} style={{ '--risk-progress': `${location.riskScore * 0.75}%` }}>
                      <div className="risk-meter-inner">
                        <strong>{location.riskScore}</strong>
                        <span>out of 100</span>
                      </div>
                    </div>
                    <div className="risk-copy">
                      <span className={`risk-label risk-label-${location.risk.toLowerCase()}`}><span /> {location.risk} risk</span>
                      <h3>{location.description}</h3>
                      <p>Illustrative score only — not a forecast or official warning.</p>
                    </div>
                  </div>
                  <div className="risk-scale" aria-label="Risk scale: low, moderate, high">
                    <span>Low</span><span>Moderate</span><span>High</span>
                  </div>
                  <div className="factors-heading"><strong>Contributing factors</strong><span>DEMO VALUES</span></div>
                  <div className="factor-list">
                    {location.factors.map((factor) => (
                      <div className="factor-row" key={factor.name}>
                        <span className="factor-name">{factor.name}</span>
                        <div className="factor-track"><span style={{ width: `${factor.value}%` }} /></div>
                        <span className="factor-level">{factor.level}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>

            <article className="panel alerts-panel" id="alerts">
            <PanelHeading title="Recent alerts" subtitle="Sample community updates for this demo">
              {!loading && !isEmpty && location.alerts.length > 0 && <button className="text-button" type="button" onClick={() => selectSection('alerts')}>View all <Icon name="arrow" size={14} /></button>}
            </PanelHeading>
            {loading ? <LoadingState label="Loading sample alerts…" compact /> : isEmpty ? <EmptyState icon="search" title="No demo alerts to show" detail="Search a sample city to view its example alerts." compact /> : location.alerts.length === 0 ? (
              <EmptyState icon="check" title="All clear in this demo" detail="There are no sample alerts for this location." compact />
            ) : (
              <div className="alerts-list">
                {location.alerts.map((alert) => (
                  <div className="alert-row" key={`${alert.title}-${alert.area}`}>
                    <div className={`alert-icon alert-${alert.tone}`}><Icon name={alert.type === 'rain' ? 'rain' : alert.type === 'water' ? 'droplets' : 'activity'} size={18} /></div>
                    <div className="alert-copy"><strong>{alert.title}</strong><span><Icon name="location" size={13} /> {alert.area}</span></div>
                    <span className={`alert-type type-${alert.tone}`}>{alert.type === 'rain' ? 'WEATHER' : alert.type === 'water' ? 'COMMUNITY' : 'ADVISORY'}</span>
                    <span className="alert-time">{alert.time}</span>
                    <button className="alert-open icon-button" aria-label={`Open ${alert.title}`}><Icon name="chevron" size={17} /></button>
                  </div>
                ))}
              </div>
            )}
            </article>
          </section>

          <section className="lower-grid" aria-label="Additional dashboard panels">
            <article className="panel trend-panel">
              <PanelHeading title="Rainfall trend" subtitle="Illustrative demo series · not observed data">
                <span className="trend-unit">mm</span>
              </PanelHeading>
              <div className="trend-chart" role="img" aria-label="Illustrative sample rainfall trend over seven days">
                <div className="chart-axis"><span>60</span><span>40</span><span>20</span><span>0</span></div>
                <div className="chart-grid"><i /><i /><i /><i /></div>
                <div className="chart-bars">
                  {[22, 35, 28, 48, 56, 72, 61].map((height, index) => (
                    <div className="chart-column" key={index}><span className="chart-bar" style={{ height: `${height}%` }} /><small>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</small></div>
                  ))}
                </div>
              </div>
            </article>
            <article className="panel quick-panel" id="reports">
              <PanelHeading title="Quick actions" subtitle="Explore this demo dashboard" />
              <div className="quick-actions">
                <a className="quick-action" href="#map" onClick={() => selectSection('map')}><span><Icon name="map" size={18} /></span><strong>View risk map</strong><small>Illustrative zones</small></a>
                <a className="quick-action" href="#alerts" onClick={() => selectSection('alerts')}><span><Icon name="bell" size={18} /></span><strong>View alerts</strong><small>Sample updates</small></a>
                <button className="quick-action" type="button" onClick={() => { chooseDemoCity('Vijayawada'); document.getElementById('location-search')?.focus() }}><span><Icon name="search" size={18} /></span><strong>Search a city</strong><small>Demo locations only</small></button>
                <a className="quick-action" href="#settings" onClick={() => selectSection('settings')}><span><Icon name="info" size={18} /></span><strong>Data notes</strong><small>Sources & limitations</small></a>
              </div>
            </article>
            <article className="panel forecast-panel" id="settings">
              <PanelHeading title="Weather forecast" subtitle="Live forecast not connected">
                <span className="forecast-badge">NOT AVAILABLE</span>
              </PanelHeading>
              <div className="forecast-empty">
                <span><Icon name="cloud" size={23} /></span>
                <strong>No forecast provider connected</strong>
                <p>Forecast cards will appear when a verified weather source is integrated.</p>
              </div>
            </article>
          </section>

          <footer className="page-footer">
            <span><Icon name="shield" size={15} /> FloodGuard AI <span className="footer-separator">·</span> A hackathon demo</span>
            <span>Sample data only — not for emergency decisions.</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function PanelHeading({ title, subtitle, children }) {
  return (
    <div className="panel-heading">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      {children && <div className="panel-heading-action">{children}</div>}
    </div>
  )
}

function MetricCard({ title, icon, iconClass, value, unit, detail, visual, loading }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{title}</span><span className={`metric-icon ${iconClass}`}><Icon name={icon} size={17} /></span></div>
      <div className="metric-value">{loading ? <span className="skeleton skeleton-value" /> : <><strong>{value}</strong><span>{unit}</span></>}</div>
      <div className={`metric-detail ${loading ? 'muted' : ''}`}>{loading ? 'Loading demo data…' : detail}</div>
      <div className={`metric-visual ${visual}`} aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>
    </article>
  )
}

function LoadingState({ label, compact = false }) {
  return <div className={`loading-state ${compact ? 'loading-compact' : ''}`} role="status"><span className="loading-spinner" />{label}</div>
}

function EmptyState({ icon, title, detail, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'empty-compact' : ''}`}>
      <span className="empty-icon"><Icon name={icon} size={18} /></span>
      <div><strong>{title}</strong><p>{detail}</p></div>
    </div>
  )
}

export default App
