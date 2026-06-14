import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import CreateClaim from '../components/claims/CreateClaim.vue'
import Claims from '../views/Claims.vue'
import CreateFnol from '../views/CreateFnol.vue'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '../stores/auth.store'

const routes = [
  // ── Public ────────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true },
  },

  // ── Protected (requires auth) ──────────────────────────
  {
    path: '/',
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard,
      },
      {
        path: 'create-claim',
        name: 'CreateClaim',
        component: CreateClaim,
      },
      {
        path: 'claims',
        name: 'Claims',
        component: Claims,
      },
      {
        path: '/fnol',
        name: 'fnol',
        component: CreateFnol,
      },
      {
        path: '/inspection/new',
        component: () => import('../views/InspectionForm.vue'),
      },
      {
        path: '/preliminary-report',
        name: 'PreliminaryReport',
        component: () => import('../views/Preliminaryreport.vue'),
      },

      // ── Admin only ──────────────────────────────────────
      {
        path: '/admin/users',
        name: 'AdminUsers',
        component: () => import('../views/AdminUsers.vue'),
        meta: { requiresAuth: true, adminOnly: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from) => {
  const authStore = useAuthStore()

  if (to.path === '/login' && authStore.isAuthenticated) return '/'
  if (to.meta.requiresAuth && !authStore.isAuthenticated) return '/login'
  if (to.meta.adminOnly && !authStore.isAdmin) return '/'
})

export default router
