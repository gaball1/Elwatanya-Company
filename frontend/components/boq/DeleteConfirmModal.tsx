"use client";

interface DeleteConfirmModalProps {
  isArabic: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  isArabic,
  message,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-5">
        <h3 className="text-xl font-bold text-primary mb-4">
          {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
        </h3>
        <p className="text-text-secondary mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border rounded-xl">
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-danger text-white rounded-xl">
            {isArabic ? "حذف" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
