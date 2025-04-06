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
const TOAST_REMOVE_DELAY = 1000000

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

const toastTimeouts = new Map()

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
      const toast = {
        ...props,
        id,
        open: true,
      }

      // Dispatch custom event for the Toaster component to pick up
      const event = new CustomEvent("toast.add", { detail: { toast } })
      document.dispatchEvent(event)

      return {
        id,
        dismiss: () => {
          const dismissEvent = new CustomEvent("toast.remove", { detail: { toastId: id } })
          document.dispatchEvent(dismissEvent)
        },
        update: (props) => {
          const updateEvent = new CustomEvent("toast.update", { 
            detail: { 
              toastId: id, 
              toast: { ...toast, ...props } 
            } 
          })
          document.dispatchEvent(updateEvent)
        }
      }
    },
    dismiss: (toastId) => {
      const dismissEvent = new CustomEvent("toast.remove", { detail: { toastId } })
      document.dispatchEvent(dismissEvent)
    },
  }
} 