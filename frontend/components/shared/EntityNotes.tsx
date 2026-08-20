/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { MessageSquare, Send, Trash2, Edit2, Check, X } from "lucide-react";
import { entityNoteService, type EntityNote } from "@/services/entity-note.service";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";

interface EntityNotesProps {
  entityType: string;
  entityId: string;
}

export default function EntityNotes({ entityType, entityId }: EntityNotesProps) {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const [notes, setNotes] = useState<EntityNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await entityNoteService.list(entityType, entityId);
      setNotes(data);
    } catch {} finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setSending(true);
    try {
      await entityNoteService.create({ entityType, entityId, content: newNote.trim() });
      setNewNote("");
      load();
    } catch {
      showToast(isArabic ? "فشل إضافة الملاحظة" : "Failed to add note", "error");
    } finally {
      setSending(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      await entityNoteService.update(id, editContent.trim());
      setEditingId(null);
      load();
    } catch {
      showToast(isArabic ? "فشل التعديل" : "Failed to update", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isArabic ? "هل أنت متأكد؟" : "Are you sure?")) return;
    try {
      await entityNoteService.delete(id);
      load();
    } catch {
      showToast(isArabic ? "فشل الحذف" : "Failed to delete", "error");
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString(isArabic ? "ar-EG" : "en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      {ToastComponent}
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <MessageSquare size={16} />
        {isArabic ? "ملاحظات" : "Notes"} ({notes.length})
      </h3>

      {/* Add Note */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={isArabic ? "أضف ملاحظة..." : "Add a note..."}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:border-gold outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={sending || !newNote.trim()}
          className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Notes List */}
      {loading ? (
        <p className="text-xs text-text-muted text-center py-2">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-2">{isArabic ? "لا توجد ملاحظات" : "No notes yet"}</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="bg-surface-secondary rounded-lg p-3">
              {editingId === note.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(note.id)}
                    className="flex-1 px-2 py-1 border border-border rounded text-sm bg-surface text-text-primary outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(note.id)} className="p-1 text-success"><Check size={14} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-text-muted"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-text-primary">{note.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-text-muted">{note.userName || note.userEmail || "—"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted">{formatDate(note.createdAt)}</span>
                      {note.userId === user?.id && (
                        <>
                          <button onClick={() => { setEditingId(note.id); setEditContent(note.content); }} className="text-text-muted hover:text-info"><Edit2 size={12} /></button>
                          <button onClick={() => handleDelete(note.id)} className="text-text-muted hover:text-danger"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
