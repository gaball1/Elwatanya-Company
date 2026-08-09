"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Bot,
  X,
  Send,
  Sparkles,
  MessageSquare,
  AlertCircle,
  History,
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  ChevronLeft,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  aiAgentService,
  AgentResponse,
  ConversationSummary,
} from "@/services/ai-agent.service";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: string;
  data?: any;
}

export default function AiAgentChat() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const t = useTranslations("ai_agent");
  const isArabic = locale === "ar";

  const suggestions = [
    t("suggestions.create_project"),
    t("suggestions.pending_approvals"),
    t("suggestions.list_subcontractors"),
    t("suggestions.explain_boq"),
  ];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: t("greeting"),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTextRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai_agent_conversation_id");
      if (saved) setConversationId(saved);
    } catch {
      // localStorage unavailable - conversation still works, just not persisted
    }
  }, []);

  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem("ai_agent_conversation_id", conversationId);
      }
    } catch {
      // ignore storage errors
    }
  }, [conversationId]);

  useEffect(() => {
    if (open && view === "chat" && inputRef.current) inputRef.current.focus();
  }, [open, view]);

  useEffect(() => {
    if (open && view === "history") {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const loadConversations = async () => {
    setHistoryLoading(true);
    try {
      const items = await aiAgentService.listConversations(search || undefined);
      setConversations(items);
    } catch {
      setConversations([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openConversation = async (id: string) => {
    try {
      const detail = await aiAgentService.getConversation(id);
      const loaded: Message[] = detail.messages.map((m) => ({
        id: m.id,
        role: m.role === "system" ? "assistant" : (m.role as "user" | "assistant"),
        content: m.content,
        timestamp: new Date(m.timestamp),
        intent: m.intent,
      }));
      setMessages(
        loaded.length
          ? loaded
          : [{ id: "0", role: "assistant", content: t("greeting"), timestamp: new Date() }]
      );
      setConversationId(id);
      setError(null);
      setView("chat");
    } catch {
      setError(t("error_message"));
    }
  };

  const newConversation = () => {
    setMessages([
      { id: "0", role: "assistant", content: t("greeting"), timestamp: new Date() },
    ]);
    setConversationId(undefined);
    setError(null);
    try {
      localStorage.removeItem("ai_agent_conversation_id");
    } catch {
      // ignore
    }
    setView("chat");
  };

  const renameConversation = async (item: ConversationSummary) => {
    const title = prompt(
      isArabic ? "أدخل عنواناً جديداً للمحادثة" : "Enter a new title",
      item.title
    );
    if (title === null || !title.trim()) return;
    await aiAgentService.renameConversation(item.id, title.trim());
    loadConversations();
  };

  const pinConversation = async (item: ConversationSummary) => {
    await aiAgentService.togglePin(item.id, !item.isPinned);
    loadConversations();
  };

  const deleteConversation = async (item: ConversationSummary) => {
    if (!confirm(isArabic ? "حذف هذه المحادثة؟" : "Delete this conversation?")) {
      return;
    }
    await aiAgentService.deleteConversation(item.id);
    if (conversationId === item.id) {
      setConversationId(undefined);
      try {
        localStorage.removeItem("ai_agent_conversation_id");
      } catch {
        // ignore
      }
    }
    loadConversations();
  };

  const handleSend = async (overrideText?: string, retryCount = 0) => {
    const text = (overrideText || input).trim();
    if (!text) return;

    if (retryCount === 0) {
      const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);
      setError(null);
      pendingTextRef.current = text;
    }

    try {
      const response: AgentResponse = await aiAgentService.chat({
        message: text,
        conversationId,
        context: {},
      });

      if (!response) {
        throw new Error(t("error_message"));
      }

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message || t("error_message"),
        timestamp: new Date(),
        intent: response.intent,
        data: response.data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      pendingTextRef.current = null;

      if (response.requiresFollowUp && response.followUpQuestion) {
        const followUp: Message = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: `ℹ️ ${response.followUpQuestion}`,
          timestamp: new Date(),
        };
        setTimeout(() => setMessages((prev) => [...prev, followUp]), 300);
      }
      setIsTyping(false);
    } catch (err: any) {
      const isNetworkError =
        !err?.status ||
        err?.status === 408 ||
        err?.status === 502 ||
        err?.status === 503 ||
        err?.status === 504 ||
        err?.name === "TypeError" ||
        err?.message?.includes("fetch") ||
        err?.message?.includes("network") ||
        err?.message?.includes("timed out");

      if (isNetworkError && retryCount < 2) {
        setTimeout(() => handleSend(text, retryCount + 1), 1000);
        setError(null);
        return;
      }
      pendingTextRef.current = null;
      setError(err?.message || t("error_message"));
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 left-6 z-50 w-14 h-14 rounded-2xl bg-gold text-white shadow-dropdown",
          "flex items-center justify-center hover:bg-gold-dark transition-all duration-200 hover:scale-105 active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2",
          open && "hidden"
        )}
        aria-label={isArabic ? "فتح المساعد الذكي" : "Open AI Agent"}
      >
        <Bot size={24} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 left-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-2xl shadow-modal overflow-hidden"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-gold-50 to-gold-100">
              <div className="flex items-center gap-2.5">
                {view === "history" && (
                  <button
                    onClick={() => setView("chat")}
                    className="p-1.5 rounded-lg hover:bg-gold/10 text-gold-600 transition-colors"
                    aria-label={isArabic ? "رجوع" : "Back"}
                  >
                    <ChevronLeft size={18} className={cn(isArabic && "rotate-180")} />
                  </button>
                )}
                <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
                  {view === "history" ? (
                    <History size={16} className="text-white" />
                  ) : (
                    <Sparkles size={16} className="text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gold-700">
                    {view === "history" ? (isArabic ? "المحادثات السابقة" : "Conversations") : t("title")}
                  </h3>
                  <p className="text-[11px] text-gold-600">
                    {view === "history" ? (isArabic ? "استئناف أو إدارة" : "Resume or manage") : t("subtitle")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setView(view === "chat" ? "history" : "chat")}
                  className="p-1.5 rounded-lg hover:bg-gold/10 text-gold-600 hover:text-gold-700 transition-colors"
                  aria-label={isArabic ? "المحادثات" : "Conversations"}
                >
                  <History size={18} />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gold/10 text-gold-600 hover:text-gold-700 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {view === "history" ? (
              <div className="h-[440px] overflow-y-auto bg-surface-secondary/50">
                <div className="p-3 flex items-center gap-2 border-b border-border">
                  <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={isArabic ? "بحث في المحادثات..." : "Search conversations..."}
                      className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
                    />
                  </div>
                  <button
                    onClick={newConversation}
                    className="p-2 rounded-xl bg-gold text-white hover:bg-gold-dark transition-colors"
                    aria-label={isArabic ? "محادثة جديدة" : "New conversation"}
                    title={isArabic ? "محادثة جديدة" : "New conversation"}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {historyLoading ? (
                  <div className="p-6 text-center text-text-muted text-sm">
                    {isArabic ? "جاري التحميل..." : "Loading..."}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center text-text-secondary text-sm">
                    {isArabic ? "لا توجد محادثات سابقة" : "No previous conversations"}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {conversations.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-3 flex items-start justify-between gap-2 hover:bg-gold-50/50 transition-colors cursor-pointer group"
                        onClick={() => openConversation(item.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {item.title}
                            </p>
                            {item.isPinned && <Pin size={12} className="text-gold shrink-0" />}
                          </div>
                          {item.lastMessage && (
                            <p className="text-xs text-text-muted truncate mt-0.5">
                              {item.lastMessage}
                            </p>
                          )}
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {item.messageCount} {isArabic ? "رسالة" : "messages"}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); renameConversation(item); }}
                            className="p-1.5 rounded-lg hover:bg-gold/10 text-text-secondary hover:text-gold transition-colors"
                            aria-label={isArabic ? "إعادة تسمية" : "Rename"}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); pinConversation(item); }}
                            className="p-1.5 rounded-lg hover:bg-gold/10 text-text-secondary hover:text-gold transition-colors"
                            aria-label={isArabic ? "تثبيت" : "Pin"}
                          >
                            {item.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteConversation(item); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors"
                            aria-label={isArabic ? "حذف" : "Delete"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="h-[440px] overflow-y-auto p-4 space-y-3 bg-surface-secondary/50">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-gold text-white rounded-br-sm"
                            : "bg-surface border border-border text-text-primary rounded-bl-sm shadow-sm"
                        )}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.data && (
                          <div className="mt-2 pt-2 border-t border-border/50 text-xs text-text-muted">
                            {t("data_received")}
                          </div>
                        )}
                        <p className={cn("text-[10px] mt-1 opacity-60", msg.role === "user" ? "text-white/70" : "text-text-muted")}>
                          {msg.timestamp.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}
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

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-sm text-red-700 flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {messages.length === 1 && (
                  <div className="px-4 py-2 border-t border-border bg-surface-secondary/30">
                    <p className="text-[11px] text-text-muted mb-2 flex items-center gap-1">
                      <MessageSquare size={12} /> {t("suggested_questions")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSend(s)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:bg-gold-50 hover:text-gold-700 hover:border-gold/30 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 border-t border-border bg-surface">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("input_placeholder")}
                    className="flex-1 bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-all"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="p-2.5 rounded-xl bg-gold text-white hover:bg-gold-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
