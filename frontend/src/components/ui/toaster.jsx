import React, { useState, useEffect } from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastAction,
} from "./toast"

export function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    // Custom event listener for toast.add
    const handleAddToast = (event) => {
      const { toast } = event.detail
      setToasts((prevToasts) => [...prevToasts, toast])
    }

    // Custom event listener for toast.remove
    const handleRemoveToast = (event) => {
      const { toastId } = event.detail
      setToasts((prevToasts) => 
        prevToasts.filter((toast) => toast.id !== toastId)
      )
    }

    // Custom event listener for toast.update
    const handleUpdateToast = (event) => {
      const { toastId, toast } = event.detail
      setToasts((prevToasts) => 
        prevToasts.map((t) => 
          t.id === toastId ? { ...t, ...toast } : t
        )
      )
    }

    // Add event listeners
    document.addEventListener("toast.add", handleAddToast)
    document.addEventListener("toast.remove", handleRemoveToast)
    document.addEventListener("toast.update", handleUpdateToast)

    // Clean up event listeners
    return () => {
      document.removeEventListener("toast.add", handleAddToast)
      document.removeEventListener("toast.remove", handleRemoveToast)
      document.removeEventListener("toast.update", handleUpdateToast)
    }
  }, [])

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action && <ToastAction altText="Action">{action}</ToastAction>}
          <ToastClose onClick={() => {
            const dismissEvent = new CustomEvent("toast.remove", { detail: { toastId: id } })
            document.dispatchEvent(dismissEvent)
          }} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
} 