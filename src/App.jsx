import { useEffect, useState } from 'react'
import { HashRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'

const TEMPLATE_OPTIONS = ['cardLayout', 'profileLayout', 'tableLayout', 'galleryLayout']
const ADMIN_STORAGE_KEY = 'learnbio-admin-token'
const MENU_STORAGE_KEY = 'learnbio-custom-menus'
const MENU_ORDER_KEY = 'learnbio-menu-order'
const MENU_JSON_STORAGE_PREFIX = 'learnbio-menu-json-'

const slugify = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'menu'

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

const getStoredToken = () => localStorage.getItem(ADMIN_STORAGE_KEY) || ''
const SITE_CONTENT_STORAGE_KEY = 'learnbio-site-content'

const getStoredSiteContent = () => {
  try {
    const raw = localStorage.getItem(SITE_CONTENT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const mergeSiteContent = (content = {}) => {
  const storedContent = getStoredSiteContent()

  return {
    ...defaultSiteContent,
    ...content,
    ...storedContent,
    hero: { ...defaultSiteContent.hero, ...(content.hero || {}), ...(storedContent.hero || {}) },
    common: { ...defaultSiteContent.common, ...(content.common || {}), ...(storedContent.common || {}) },
    admin: { ...defaultSiteContent.admin, ...(content.admin || {}), ...(storedContent.admin || {}) },
    dashboard: { ...defaultSiteContent.dashboard, ...(content.dashboard || {}), ...(storedContent.dashboard || {}) },
    templateLabels: { ...defaultSiteContent.templateLabels, ...(content.templateLabels || {}), ...(storedContent.templateLabels || {}) },
    stats: Array.isArray(storedContent.stats) ? storedContent.stats : Array.isArray(content.stats) ? content.stats : defaultSiteContent.stats,
  }
}

const defaultSiteContent = {
  brand: 'LearnBio',
  siteTitle: 'Coaching Classes',
  hero: {
    eyebrow: 'Academic growth',
    heading: 'Build confidence for every board exam milestone.',
    description:
      'LearnBio supports students with structured classes, expert mentorship, and progress-led teaching designed for long-term performance.',
    primaryButton: 'Explore {menuName}',
    secondaryButton: 'Admin portal',
  },
  stats: [
    { label: 'Students coached', value: '3,200+' },
    { label: 'Success rate', value: '94%' },
    { label: 'Mentor ratio', value: '1:18' },
  ],
  common: {
    loading: 'Loading website menu data...',
    noMenus: 'No menu data is available yet.',
    preparingMenu: 'Preparing menu content...',
    notFound: 'This page could not be found.',
    backHome: 'Back home',
    menuPage: 'Menu page',
    adminLogin: 'Admin Login',
    view: 'View',
    itemsReady: 'items ready to display',
    dynamicContentPage: 'Dynamic content page',
  },
  templateLabels: {
    program: 'Program',
    duration: 'Duration',
    fee: 'Fee',
    mode: 'Mode',
    defaultHighlight: 'Program',
    defaultCta: 'Learn more',
  },
  admin: {
    pageTitle: 'Admin access',
    heading: 'Login to dashboard',
    userIdLabel: 'User ID',
    passwordLabel: 'Password',
    signIn: 'Sign in',
    demo: 'Demo credentials: admin@learnbio / learnbio123',
  },
  dashboard: {
    pageTitle: 'Dashboard',
    heading: 'Menu Administration',
    logOut: 'Log out',
    createTitle: 'Create new menu',
    createSubtext: 'Each menu is generated as a separate JSON file and stored in the browser.',
    menuNameLabel: 'Menu name',
    templateLabel: 'Template',
    itemsJsonLabel: 'Items JSON',
    saveButton: 'Save menu',
    existingMenus: 'Existing menus',
  },
}

const getCustomMenus = () => {
  try {
    return JSON.parse(localStorage.getItem(MENU_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

const getMenuJsonStorageKey = (menuName) => `${MENU_JSON_STORAGE_PREFIX}${slugify(menuName)}`

const saveMenuJsonFile = (menuData) => {
  localStorage.setItem(getMenuJsonStorageKey(menuData.menuName), JSON.stringify(menuData, null, 2))
  return getMenuJsonStorageKey(menuData.menuName)
}

const deleteMenuJsonFile = (menuData) => {
  localStorage.removeItem(getMenuJsonStorageKey(menuData.menuName))
}

const downloadMenuJson = (menuData) => {
  const blob = new Blob([JSON.stringify(menuData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slugify(menuData.menuName)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const fetchMenuIndex = async () => {
  const index = await fetchJson('/data/menus/index.json')
  return Array.isArray(index.menus) ? index.menus : []
}

const getMenuOrder = () => {
  try {
    return JSON.parse(localStorage.getItem(MENU_ORDER_KEY) || '[]')
  } catch {
    return []
  }
}

const saveMenuOrder = (orderedMenus) => {
  const nextOrder = orderedMenus.map((menu) => slugify(menu.menuName))
  localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(nextOrder))
}

const orderMenus = (menus = []) => {
  const preferredOrder = getMenuOrder()
  if (!preferredOrder.length) {
    return menus
  }

  const menuMap = new Map(menus.map((menu) => [slugify(menu.menuName), menu]))
  const orderedMenus = preferredOrder
    .map((slug) => menuMap.get(slug))
    .filter(Boolean)
  const remainingMenus = menus.filter((menu) => !preferredOrder.includes(slugify(menu.menuName)))

  return [...orderedMenus, ...remainingMenus]
}

const loadAllMenus = async () => {
  const fileNames = await fetchMenuIndex()
  const baseMenus = await Promise.all(
    fileNames.map(async (fileName) => fetchJson(`/data/menus/${fileName}`)),
  )

  const customMenus = getCustomMenus()
  return orderMenus([...baseMenus, ...customMenus])
}

function AppLayout({ children }) {
  const [siteContent, setSiteContent] = useState(defaultSiteContent)
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLayoutData = async () => {
      try {
        const [content, allMenus] = await Promise.all([
          fetchJson('/data/siteContent.json'),
          loadAllMenus(),
        ])

        setSiteContent(mergeSiteContent(content))
        setMenus(allMenus)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadLayoutData()
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-slate-100 p-8 text-center text-slate-600">{siteContent.common.loading}</div>
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-block">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-600">{siteContent.brand}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{siteContent.siteTitle}</h1>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {menus.map((menu) => (
              <Link key={`${menu.menuName}-${menu.templateType}`} to={`/menu/${slugify(menu.menuName)}`} className="text-sm font-medium text-slate-600 transition hover:text-brand-600">
                {menu.menuName}
              </Link>
            ))}
          </nav>

          <Link to="/admin/login" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700">
            {siteContent.common.adminLogin}
          </Link>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}

function HomePage() {
  const [siteContent, setSiteContent] = useState(defaultSiteContent)
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContent = async () => {
      try {
        const content = await fetchJson('/data/siteContent.json')
        setSiteContent(mergeSiteContent(content))
      } catch (error) {
        console.error(error)
      }
    }

    const loadMenus = async () => {
      try {
        const allMenus = await loadAllMenus()
        setMenus(allMenus)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadContent()
    loadMenus()
  }, [])

  if (loading) {
    return <div className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-soft">{siteContent.common.loading}</div>
  }

  if (!menus.length) {
    return <div className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-soft">{siteContent.common.noMenus}</div>
  }

  const featuredMenu = menus[0]
  const hero = siteContent.hero || defaultSiteContent.hero
  const stats = siteContent.stats || defaultSiteContent.stats

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-10">
          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500 p-8 text-white shadow-soft sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-100">{hero.eyebrow}</p>
                <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{hero.heading}</h2>
                <p className="mt-4 max-w-xl text-base text-cyan-50/90">{hero.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to={`/menu/${slugify(featuredMenu.menuName)}`} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-700 transition hover:bg-slate-100">
                    {hero.primaryButton.replace('{menuName}', featuredMenu.menuName)}
                  </Link>
                  <Link to="/admin/login" className="rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
                    {hero.secondaryButton}
                  </Link>
                </div>
              </div>
              <div className="rounded-3xl bg-white/10 p-5 backdrop-blur-sm">
                <div className="grid gap-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-100">{stat.label}</p>
                      <p className="mt-2 text-3xl font-black">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {menus.map((menu) => (
              <Link key={`${menu.menuName}-${menu.templateType}`} to={`/menu/${slugify(menu.menuName)}`} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
                <div className="mb-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-brand-700">
                  {menu.templateType}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{menu.menuName}</h3>
                <p className="mt-3 text-sm text-slate-600">
                  {Array.isArray(menu.items) ? `${menu.items.length} ${siteContent.common.itemsReady}` : siteContent.common.dynamicContentPage}
                </p>
              </Link>
            ))}
          </section>
        </div>
    </div>
  )
}

function MenuView() {
  const { menuName } = useParams()
  const [siteContent, setSiteContent] = useState(defaultSiteContent)
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContent = async () => {
      try {
        const content = await fetchJson('/data/siteContent.json')
        setSiteContent(mergeSiteContent(content))
      } catch (error) {
        console.error(error)
      }
    }

    const loadMenu = async () => {
      try {
        const customMenus = getCustomMenus()
        const directMenu = customMenus.find((item) => slugify(item.menuName) === slugify(menuName))

        if (directMenu) {
          setMenu(directMenu)
          return
        }

        const data = await fetchJson(`/data/menus/${slugify(menuName)}.json`)
        setMenu(data)
      } catch (error) {
        console.error(error)
        setMenu(null)
      } finally {
        setLoading(false)
      }
    }

    loadContent()
    loadMenu()
  }, [menuName])

  if (loading) {
    return <div className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-soft">{siteContent.common.preparingMenu}</div>
  }

  if (!menu) {
    return <div className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-soft">{siteContent.common.notFound}</div>
  }

  const commonUi = siteContent.common || defaultSiteContent.common

  return (
    <div className="px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-soft">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">{commonUi.menuPage}</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">{menu.menuName}</h2>
          </div>
          <Link to="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700">
            {commonUi.backHome}
          </Link>
        </div>

        {renderMenuTemplate(menu, siteContent)}
      </div>
    </div>
  )
}

function renderMenuTemplate(menu, siteContent = defaultSiteContent) {
  const items = Array.isArray(menu.items) ? menu.items : []
  const labels = siteContent.templateLabels || defaultSiteContent.templateLabels
  const commonUi = siteContent.common || defaultSiteContent.common

  switch (menu.templateType) {
    case 'profileLayout':
      if (items.length === 1) {
        const item = items[0]
        return (
          <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-soft">
            <div className="grid min-h-[70vh] gap-0 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500 p-8 text-white sm:p-12">
                <div className="text-center">
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/40 bg-white/10 text-5xl font-black shadow-lg backdrop-blur-sm">
                    {item.name?.charAt(0) || 'M'}
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100">Faculty</p>
                  <h3 className="mt-4 text-3xl font-black sm:text-4xl">{item.name}</h3>
                  <p className="mt-3 text-base font-semibold uppercase tracking-[0.2em] text-cyan-50">{item.role}</p>
                </div>
              </div>

              <div className="p-8 sm:p-10 lg:p-12">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600">Profile</p>
                  <h4 className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">Academic background</h4>
                  <p className="mt-5 text-base leading-8 text-slate-600">{item.bio}</p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {(item.stats || []).map((stat) => (
                      <span key={stat} className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
                        {stat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )
      }

      return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <article key={`${item.name}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-cyan-100 text-xl font-black text-brand-700">
                {item.name?.charAt(0) || 'A'}
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-900">{item.name}</h3>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{item.role}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">{item.bio}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(item.stats || []).map((stat) => (
                  <span key={stat} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{stat}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )
    case 'tableLayout':
      return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">{labels.program}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">{labels.duration}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">{labels.fee}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">{labels.mode}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={`${item.title}-${index}`} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-800">{item.title}</td>
                  <td className="px-6 py-4 text-slate-600">{item.duration}</td>
                  <td className="px-6 py-4 text-slate-600">{item.fee}</td>
                  <td className="px-6 py-4 text-slate-600">{item.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'galleryLayout':
      return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <div key={`${item.title}-${index}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
              <img src={item.image} alt={item.title} className="h-72 w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )
    case 'cardLayout':
    default:
      return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <article key={`${item.title}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
              <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-700">
                {item.highlight || labels.defaultHighlight}
              </div>
              <h3 className="mt-5 text-2xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-600">{item.subtitle}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
              <button type="button" className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                {item.cta || labels.defaultCta}
              </button>
            </article>
          ))}
        </div>
      )
  }
}

function AdminLoginPage() {
  const [siteContent, setSiteContent] = useState(defaultSiteContent)
  const [userId, setUserId] = useState('admin@learnbio')
  const [password, setPassword] = useState('learnbio123')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const loadContent = async () => {
      try {
        const content = await fetchJson('/data/siteContent.json')
        setSiteContent(mergeSiteContent(content))
      } catch (error) {
        console.error(error)
      }
    }

    loadContent()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const users = await fetchJson('/data/adminUsers.json')
      const isValid = users.some((user) => user.userId === userId && user.password === password)

      if (!isValid) {
        throw new Error('Invalid userId or password.')
      }

      localStorage.setItem(ADMIN_STORAGE_KEY, `frontend-session-${Date.now()}`)
      navigate('/admin/dashboard')
    } catch (loginError) {
      setError(loginError.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-soft">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">{siteContent.admin.pageTitle}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">{siteContent.admin.heading}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{siteContent.admin.userIdLabel}</label>
            <input
              type="text"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
              placeholder="admin@learnbio"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{siteContent.admin.passwordLabel}</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            {siteContent.admin.signIn}
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-brand-50 p-3 text-center text-sm text-brand-700">
          {siteContent.admin.demo}
        </div>
      </div>
    </div>
  )
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const token = getStoredToken()
  const [siteContent, setSiteContent] = useState(defaultSiteContent)
  const [siteForm, setSiteForm] = useState(defaultSiteContent)
  const [menus, setMenus] = useState([])
  const [menuName, setMenuName] = useState('')
  const [templateType, setTemplateType] = useState('cardLayout')
  const [itemsText, setItemsText] = useState('[\n  {\n    "title": "Sample item",\n    "subtitle": "Theme",\n    "description": "Add course details here."\n  }\n]')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [siteStatus, setSiteStatus] = useState('')
  const [siteError, setSiteError] = useState('')
  const [draggedMenu, setDraggedMenu] = useState(null)
  const [editingMenu, setEditingMenu] = useState(null)

  useEffect(() => {
    const loadContent = async () => {
      try {
        const content = await fetchJson('/data/siteContent.json')
        const mergedContent = mergeSiteContent(content)
        setSiteContent(mergedContent)
        setSiteForm(mergedContent)
      } catch (error) {
        console.error(error)
      }
    }

    loadContent()

    if (!token) {
      navigate('/admin/login')
      return
    }

    const loadMenus = async () => {
      try {
        const allMenus = await loadAllMenus()
        setMenus(allMenus)
      } catch (loadError) {
        console.error(loadError)
      }
    }

    loadMenus()
  }, [navigate, token])

  const resetMenuForm = () => {
    setMenuName('')
    setTemplateType('cardLayout')
    setItemsText('[\n  {\n    "title": "Sample item",\n    "subtitle": "Theme",\n    "description": "Add course details here."\n  }\n]')
    setEditingMenu(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setStatus('')

    try {
      const parsedItems = JSON.parse(itemsText)

      if (!Array.isArray(parsedItems)) {
        throw new Error('Items must be a JSON array')
      }

      const nextMenu = {
        menuName,
        templateType,
        items: parsedItems,
      }

      const existingMenus = getCustomMenus()
      const nextMenus = editingMenu
        ? existingMenus.filter(
            (menu) => !(menu.menuName === editingMenu.menuName && menu.templateType === editingMenu.templateType),
          )
        : [...existingMenus]

      nextMenus.push(nextMenu)
      localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(nextMenus))
      saveMenuJsonFile(nextMenu)
      if (editingMenu && editingMenu.menuName !== nextMenu.menuName) {
        deleteMenuJsonFile(editingMenu)
      }
      setStatus(editingMenu ? `Menu updated: ${nextMenu.menuName}` : `Menu created: ${nextMenu.menuName}`)
      resetMenuForm()
      setMenus([...await loadAllMenus()])
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const handleEditMenu = (menuToEdit) => {
    setEditingMenu(menuToEdit)
    setMenuName(menuToEdit.menuName)
    setTemplateType(menuToEdit.templateType)
    setItemsText(JSON.stringify(menuToEdit.items || [], null, 2))
    setStatus('')
    setError('')
  }

  const updateSiteField = (section, field, value) => {
    setSiteForm((previous) => ({
      ...previous,
      [section]: {
        ...(previous[section] || {}),
        [field]: value,
      },
    }))
  }

  const updateSiteStat = (index, field, value) => {
    setSiteForm((previous) => {
      const nextStats = [...(previous.stats || [])]
      nextStats[index] = { ...(nextStats[index] || {}), [field]: value }
      return { ...previous, stats: nextStats }
    })
  }

  const handleSaveSiteContent = (event) => {
    event.preventDefault()
    setSiteError('')
    setSiteStatus('')

    try {
      const nextContent = {
        ...defaultSiteContent,
        ...siteForm,
        hero: { ...defaultSiteContent.hero, ...(siteForm.hero || {}) },
        common: { ...defaultSiteContent.common, ...(siteForm.common || {}) },
        admin: { ...defaultSiteContent.admin, ...(siteForm.admin || {}) },
        dashboard: { ...defaultSiteContent.dashboard, ...(siteForm.dashboard || {}) },
        templateLabels: { ...defaultSiteContent.templateLabels, ...(siteForm.templateLabels || {}) },
        stats: Array.isArray(siteForm.stats) ? siteForm.stats : defaultSiteContent.stats,
      }

      localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(nextContent))
      setSiteContent(nextContent)
      setSiteStatus('Website content saved successfully.')
    } catch (saveError) {
      setSiteError(saveError.message)
    }
  }

  const resetSiteContent = () => {
    localStorage.removeItem(SITE_CONTENT_STORAGE_KEY)
    setSiteForm(defaultSiteContent)
    setSiteContent(defaultSiteContent)
    setSiteStatus('Website content reset to default values.')
  }

  const handleDeleteMenu = async (menuToDelete) => {
    const existingMenus = getCustomMenus()
    const nextMenus = existingMenus.filter(
      (menu) => !(menu.menuName === menuToDelete.menuName && menu.templateType === menuToDelete.templateType),
    )
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(nextMenus))
    deleteMenuJsonFile(menuToDelete)
    const remainingMenus = menus.filter(
      (menu) => !(menu.menuName === menuToDelete.menuName && menu.templateType === menuToDelete.templateType),
    )
    setMenus(remainingMenus)
    saveMenuOrder(remainingMenus)
  }

  const handleReorderMenus = (sourceMenu, targetMenu) => {
    if (!sourceMenu || !targetMenu || sourceMenu.menuName === targetMenu.menuName) {
      return
    }

    const nextMenus = [...menus]
    const fromIndex = nextMenus.findIndex(
      (menu) => menu.menuName === sourceMenu.menuName && menu.templateType === sourceMenu.templateType,
    )
    const toIndex = nextMenus.findIndex(
      (menu) => menu.menuName === targetMenu.menuName && menu.templateType === targetMenu.templateType,
    )

    if (fromIndex < 0 || toIndex < 0) {
      return
    }

    const [movedMenu] = nextMenus.splice(fromIndex, 1)
    nextMenus.splice(toIndex, 0, movedMenu)
    setMenus(nextMenus)
    saveMenuOrder(nextMenus)
  }

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_STORAGE_KEY)
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">{siteContent.dashboard.pageTitle}</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">{siteContent.dashboard.heading}</h2>
          </div>
          <button type="button" onClick={handleLogout} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700">
            {siteContent.dashboard.logOut}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">{siteContent.dashboard.createTitle}</h3>
                <p className="mt-2 text-sm text-slate-600">{siteContent.dashboard.createSubtext}</p>
              </div>

              <div className="space-y-5">
                {editingMenu && (
                  <div className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
                    Editing menu: <span className="font-semibold">{editingMenu.menuName}</span>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{siteContent.dashboard.menuNameLabel}</label>
                  <input
                    type="text"
                    value={menuName}
                    onChange={(event) => setMenuName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                    placeholder="e.g. Admissions"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{siteContent.dashboard.templateLabel}</label>
                  <select
                    value={templateType}
                    onChange={(event) => setTemplateType(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                  >
                    {TEMPLATE_OPTIONS.map((template) => (
                      <option key={template} value={template}>{template}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{siteContent.dashboard.itemsJsonLabel}</label>
                  <textarea
                    value={itemsText}
                    onChange={(event) => setItemsText(event.target.value)}
                    rows={12}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800 outline-none transition focus:border-brand-300 focus:bg-white"
                  />
                </div>
              </div>

              {error && <p className="mt-5 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              {status && <p className="mt-5 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{status}</p>}

              <div className="mt-6 flex gap-3">
                <button type="submit" className="flex-1 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
                  {editingMenu ? 'Update menu' : siteContent.dashboard.saveButton}
                </button>
                {editingMenu && (
                  <button type="button" onClick={resetMenuForm} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-700">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <form onSubmit={handleSaveSiteContent} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">Website content</h3>
                <p className="mt-2 text-sm text-slate-600">Update branding, headline text, and stats from the dashboard.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Brand</label>
                  <input
                    type="text"
                    value={siteForm.brand || ''}
                    onChange={(event) => setSiteForm((previous) => ({ ...previous, brand: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Site title</label>
                  <input
                    type="text"
                    value={siteForm.siteTitle || ''}
                    onChange={(event) => setSiteForm((previous) => ({ ...previous, siteTitle: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Hero eyebrow</label>
                  <input
                    type="text"
                    value={siteForm.hero?.eyebrow || ''}
                    onChange={(event) => updateSiteField('hero', 'eyebrow', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Hero heading</label>
                  <textarea
                    value={siteForm.hero?.heading || ''}
                    onChange={(event) => updateSiteField('hero', 'heading', event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Hero description</label>
                  <textarea
                    value={siteForm.hero?.description || ''}
                    onChange={(event) => updateSiteField('hero', 'description', event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Primary CTA</label>
                  <input
                    type="text"
                    value={siteForm.hero?.primaryButton || ''}
                    onChange={(event) => updateSiteField('hero', 'primaryButton', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Secondary CTA</label>
                  <input
                    type="text"
                    value={siteForm.hero?.secondaryButton || ''}
                    onChange={(event) => updateSiteField('hero', 'secondaryButton', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Stats</label>
                  <div className="space-y-3">
                    {(siteForm.stats || []).map((stat, index) => (
                      <div key={`${stat.label || 'stat'}-${index}`} className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          value={stat.label || ''}
                          onChange={(event) => updateSiteStat(index, 'label', event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={stat.value || ''}
                          onChange={(event) => updateSiteStat(index, 'value', event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-300 focus:bg-white"
                          placeholder="Value"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {siteError && <p className="mt-5 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">{siteError}</p>}
              {siteStatus && <p className="mt-5 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{siteStatus}</p>}

              <div className="mt-6 flex gap-3">
                <button type="submit" className="flex-1 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
                  Save content
                </button>
                <button type="button" onClick={resetSiteContent} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-700">
                  Reset
                </button>
              </div>
            </form>
          </div>

          <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
            <h3 className="text-xl font-bold text-slate-900">{siteContent.dashboard.existingMenus}</h3>
            <div className="mt-5 space-y-3">
              {menus.map((menu) => (
                <div
                  key={`${menu.menuName}-${menu.templateType}`}
                  draggable
                  onDragStart={() => setDraggedMenu(menu)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    handleReorderMenus(draggedMenu, menu)
                    setDraggedMenu(null)
                  }}
                  className="flex cursor-grab items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 active:cursor-grabbing"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{menu.menuName}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{menu.templateType}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to={`/menu/${slugify(menu.menuName)}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                      {siteContent.common.view}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleEditMenu(menu)}
                      className="text-sm font-medium text-amber-600 transition hover:text-amber-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMenu(menu)}
                      className="text-sm font-medium text-red-600 transition hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
        <Route path="/menu/:menuName" element={<AppLayout><MenuView /></AppLayout>} />
        <Route path="/admin/login" element={<AppLayout><AdminLoginPage /></AppLayout>} />
        <Route path="/admin/dashboard" element={<AppLayout><AdminDashboardPage /></AppLayout>} />
        <Route path="*" element={<AppLayout><Navigate to="/" replace /></AppLayout>} />
      </Routes>
    </HashRouter>
  )
}

export default App
