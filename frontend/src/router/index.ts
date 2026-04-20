import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'

import Dashboard from '../views/Dashboard.vue'
import Claims from '../views/Claims.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [
        { path: '', component: Dashboard },
        { path: 'claims', component: Claims },
      ],
    },
  ],
})

export default router