import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import CreateClaim from '../components/claims/CreateClaim.vue'
import Claims from '../views/Claims.vue'
import CreateFnol from "../views/CreateFnol.vue"

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
      },
      {
        path: "/fnol",
        name: "fnol",
        component: CreateFnol
      },
      {
        path: "/inspection/new",
        component: () => import("../views/InspectionForm.vue")
      },
      {
        path: "/preliminary-report",
        name: "PreliminaryReport",
        component: () => import("../views/Preliminaryreport.vue")
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router