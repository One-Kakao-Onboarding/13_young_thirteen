"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Send, Smile } from "lucide-react"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const shouldFocusRef = useRef(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!disabled && shouldFocusRef.current) {
      inputRef.current?.focus()
      shouldFocusRef.current = false
    }
  }, [disabled])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (message.trim() && !disabled) {
      const msg = message.trim()
      setMessage("")
      shouldFocusRef.current = true
      onSend(msg)
      // 즉시 포커스 시도
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const preventBlur = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-white border-t">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-gray-500 flex-shrink-0"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
      >
        <Plus className="w-5 h-5" />
      </Button>
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요"
          className="w-full px-4 py-2 pr-10 rounded-full bg-kakao-gray text-kakao-dark placeholder:text-gray-400 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-kakao-yellow"
          rows={1}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
          onMouseDown={preventBlur}
          onTouchStart={preventBlur}
        >
          <Smile className="w-5 h-5" />
        </Button>
      </div>
      <Button
        type="submit"
        size="icon"
        className="bg-kakao-yellow hover:bg-kakao-yellow/90 text-kakao-dark flex-shrink-0"
        disabled={!message.trim() || disabled}
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  )
}
