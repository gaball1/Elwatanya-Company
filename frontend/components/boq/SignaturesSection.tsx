"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Plus, X } from "lucide-react";

export interface Signature {
  id: string;
  name: string;
  title: string;
  date: string;
}

interface SignaturesSectionProps {
  isArabic: boolean;
  signatures: Signature[];
  onChange: (signatures: Signature[]) => void;
}

export default function SignaturesSection({
  isArabic,
  signatures,
  onChange,
}: SignaturesSectionProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", date: new Date().toISOString().split("T")[0] });

  const add = () => {
    if (!form.name) return;
    onChange([...signatures, { id: Date.now().toString(), ...form }]);
    setForm({ name: "", title: "", date: new Date().toISOString().split("T")[0] });
    setOpen(false);
  };

  return (
    <Card className="p-5 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-primary">{isArabic ? "التوقيعات" : "Signatures"}</h3>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-sm text-gold hover:underline">
          <Plus size={16} /> {isArabic ? "إضافة توقيع" : "Add Signature"}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {signatures.map((s) => (
          <div key={s.id} className="border rounded-lg p-3 text-center">
            <div className="border-b border-gray-400 w-4/5 mx-auto mb-2 h-8" />
            <p className="font-bold text-primary">{s.name}</p>
            <p className="text-xs text-gray-500">{s.title}</p>
            <p className="text-xs text-gray-400">{s.date}</p>
          </div>
        ))}
        {signatures.length === 0 && (
          <p className="col-span-full text-center text-gray-400 text-sm py-4">
            {isArabic ? "لا توجد توقيعات" : "No signatures"}
          </p>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
            <div className="flex justify-between">
              <h2 className="font-bold text-primary">{isArabic ? "إضافة توقيع" : "Add Signature"}</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <input className="w-full p-2 border rounded-lg" placeholder={isArabic ? "الاسم" : "Name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="w-full p-2 border rounded-lg" placeholder={isArabic ? "المسمى" : "Title"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input type="date" className="w-full p-2 border rounded-lg" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <button onClick={add} className="w-full py-2 bg-primary text-white rounded-xl">{isArabic ? "إضافة" : "Add"}</button>
          </div>
        </div>
      )}
    </Card>
  );
}
