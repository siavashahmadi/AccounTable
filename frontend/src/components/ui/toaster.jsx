import React, { useState, useEffect } from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast"

const TOAST_LIMIT = 5

export function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleAddToast = (e) => {
      const { toast } = e.detail

      // Ensure we don't exceed the toast limit, removing the oldest toast if needed
      setToasts((prevToasts) => {
        if (prevToasts.length >= TOAST_LIMIT) {
          const newToasts = [...prevToasts]
          newToasts.shift() // Remove the oldest toast
          return [...newToasts, toast]
        }
        return [...prevToasts, toast]
      })
    }

    const handleRemoveToast = (e) => {
      const { toastId } = e.detail
      if (toastId) {
        setToasts((prevToasts) =>
          prevToasts.map((toast) =>
            toast.id === toastId
              ? {
                  ...toast,
                  open: false,
                }
              : toast
          )
        )
      }
    }

    const handleUpdateToast = (e) => {
      const { toastId, toast: newToast } = e.detail
      setToasts((prevToasts) =>
        prevToasts.map((toast) =>
          toast.id === toastId ? { ...toast, ...newToast } : toast
        )
      )
    }

    document.addEventListener("toast.add", handleAddToast)
    document.addEventListener("toast.remove", handleRemoveToast)
    document.addEventListener("toast.update", handleUpdateToast)

    return () => {
      document.removeEventListener("toast.add", handleAddToast)
      document.removeEventListener("toast.remove", handleRemoveToast)
      document.removeEventListener("toast.update", handleUpdateToast)
    }
  }, [])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} duration={props.duration || 6000} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
} 