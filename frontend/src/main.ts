import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './main.css'
import 'flatpickr/dist/flatpickr.css'
import { vDatepicker, vDatetimepicker } from './directives/datepicker'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.directive('datepicker', vDatepicker)
app.directive('datetimepicker', vDatetimepicker)

app.mount('#app')