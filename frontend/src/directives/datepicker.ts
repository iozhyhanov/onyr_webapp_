import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.css'
import { DirectiveBinding } from 'vue'

export const vDatepicker = {
  mounted(el: HTMLInputElement, binding: DirectiveBinding) {
    flatpickr(el, {
      dateFormat: 'Y-m-d',
      allowInput: true,
      locale: { firstDayOfWeek: 1 },
      ...binding.value
    })
  },
  unmounted(el: HTMLInputElement) {
    if ((el as any)._flatpickr) (el as any)._flatpickr.destroy()
  }
}

export const vDatetimepicker = {
  mounted(el: HTMLInputElement, binding: DirectiveBinding) {
    flatpickr(el, {
      dateFormat: 'Y-m-d H:i',
      enableTime: true,
      time_24hr: true,
      allowInput: true,
      locale: { firstDayOfWeek: 1 },
      ...binding.value
    })
  },
  unmounted(el: HTMLInputElement) {
    if ((el as any)._flatpickr) (el as any)._flatpickr.destroy()
  }
}