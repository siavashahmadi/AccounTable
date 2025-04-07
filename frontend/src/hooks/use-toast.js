// Inspired by shadcn-ui toast hook
// https://ui.shadcn.com/docs/components/toast

import { useContext } from "react"

// The issue is with these imports - ToastActionElement and ToastProps don't exist
// Let's remove them as they're not actually used in this file
// import {
//   ToastActionElement,
//   ToastProps
// } from "../components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 6000 // Changed from 1000000 to 6000ms (6 seconds)

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

const toastTimeouts = new Map()

// Function to automatically dismiss a toast after a timeout
const scheduleToastDismissal = (id, duration = TOAST_REMOVE_DELAY) => {
  if (toastTimeouts.has(id)) {
    clearTimeout(toastTimeouts.get(id))
  }
  
  const timeout = setTimeout(() => {
    const dismissEvent = new CustomEvent("toast.remove", { detail: { toastId: id } })
    document.dispatchEvent(dismissEvent)
    toastTimeouts.delete(id)
  }, duration)
  
  toastTimeouts.set(id, timeout)
}

export const addToast = (toast) => {
  const id = genId()

  const update = {
    ...toast,
    id,
    open: true,
    onOpenChange: (open) => {
      if (!open) {
        // Handle toast closing
        if (toastTimeouts.has(id)) {
          clearTimeout(toastTimeouts.get(id))
          toastTimeouts.delete(id)
        }
      }
    },
  }

  return update
}

export function useToast() {
  return {
    toast: (props) => {
      const id = genId()
      // Apply default duration of 6 seconds if not specified
      const toastWithDefaults = {
        duration: TOAST_REMOVE_DELAY, // Default duration
        ...props,
        id,
        open: true,
      }

      // Dispatch custom event for the Toaster component to pick up
      const event = new CustomEvent("toast.add", { detail: { toast: toastWithDefaults } })
      document.dispatchEvent(event)

      // Schedule automatic dismissal after specified duration or default 
      scheduleToastDismissal(id, toastWithDefaults.duration)

      return {
        id,
        dismiss: () => {
          if (toastTimeouts.has(id)) {
            clearTimeout(toastTimeouts.get(id))
            toastTimeouts.delete(id)
          }
          const dismissEvent = new CustomEvent("toast.remove", { detail: { toastId: id } })
          document.dispatchEvent(dismissEvent)
        },
        update: (props) => {
          // Reset the dismiss timer if duration is provided in the update
          if (props.duration) {
            scheduleToastDismissal(id, props.duration)
          }
          
          const updateEvent = new CustomEvent("toast.update", { 
            detail: { 
              toastId: id, 
              toast: { ...toastWithDefaults, ...props } 
            } 
          })
          document.dispatchEvent(updateEvent)
        }
      }
    },
    dismiss: (toastId) => {
      if (toastTimeouts.has(toastId)) {
        clearTimeout(toastTimeouts.get(toastId))
        toastTimeouts.delete(toastId)
      }
      const dismissEvent = new CustomEvent("toast.remove", { detail: { toastId } })
      document.dispatchEvent(dismissEvent)
    },
  }
} 