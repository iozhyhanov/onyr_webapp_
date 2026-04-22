import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import CreateClaim from '../components/CreateClaim.vue'
import Claims from '../views/Claims.vue'

const routes = [
  {
    path: '/',
    component: DefaultLayout,
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
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router