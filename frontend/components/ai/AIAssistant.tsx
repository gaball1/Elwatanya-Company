/* eslint-disable */
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Bot, X, Send, Sparkles, MessageSquare, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestions = [
  "How do I create a new project?",
  "Show me the active subcontractors",
  "What is the current treasury balance?",
  "How to generate a BOQ?",
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: "Hello! I'm your ERP assistant. Ask me anything about projects, BOQs, inventory, employees, or any part of the system.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        "how do i create a new project": "To create a new project: 1. Go to **Projects** from the sidebar. 2. Click the **New Project** button. 3. Fill in the project name, location, and budget. 4. Click **Create**. The project will appear in your project list immediately.",
        "show me the active subcontractors": "You can view active subcontractors by navigating to **Subcontractors** in the sidebar. There you'll find a table with all subcontractors, their status, and contact details. Use the status filter to show only active ones.",
        "what is the current treasury balance": "The treasury balance is displayed on the **Dashboard** under the Funds KPI card. For detailed transactions, go to **Projects > select a project > Treasury tab**.",
        "how to generate a boq": "To generate a BOQ: 1. Open a **Building** from your project. 2. Go to the **Estimates** tab. 3. Click **Add Employer BOQ** or **Add Analytical BOQ**. 4. Enter items, quantities, and unit prices. 5. Save to generate the document.",
      };

      const matchedKey = Object.keys(responses).find((k) => userMsg.content.toLowerCase().includes(k));
      const reply = matchedKey ? responses[matchedKey] : "I can help you with projects, BOQs, subcontractors, inventory, employees, treasury, attendance, and reports. Could you please provide more details about what you need?";

      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: reply, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 left-6 z-50 w-14 h-14 rounded-2xl bg-gold text-white shadow-dropdown",
          "flex items-center justify-center hover:bg-gold-dark transition-all duration-200 hover:scale-105 active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2",
          open && "hidden"
        )}
        aria-label="Open AI Assistant"
      >
        <Bot size={24} />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 left-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-2xl shadow-modal overflow-hidden"
            dir="ltr"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-gold-50 to-gold-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gold-700">AI Assistant</h3>
                  <p className="text-[11px] text-gold-600">Ask me anything about the ERP</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gold/10 text-gold-600 hover:text-gold-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-surface-secondary/50">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-gold text-white rounded-br-sm"
                        : "bg-surface border border-border text-text-primary rounded-bl-sm shadow-sm"
                    )}
                  >
                    {msg.content}
                    <p className={cn("text-[10px] mt-1 opacity-60", msg.role === "user" ? "text-white/70" : "text-text-muted")}>
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-surface border border-border rounded-xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
              <div className="px-4 py-2 border-t border-border bg-surface-secondary/30">
                <p className="text-[11px] text-text-muted mb-2 flex items-center gap-1">
                  <MessageSquare size={12} /> Suggested questions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); setTimeout(() => handleSend(), 100); }}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:bg-gold-50 hover:text-gold-700 hover:border-gold/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 p-3 border-t border-border bg-surface">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="flex-1 bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="p-2.5 rounded-xl bg-gold text-white hover:bg-gold-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
