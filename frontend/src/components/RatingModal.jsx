import { useState } from "react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { X, Star } from "lucide-react";

export default function RatingModal({ partner, parcelId, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post(`/parcels/${parcelId}/review`, { rating, comment });
      toast.success(`Rated ${partner.name} ${rating}⭐`);
      onSubmitted?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  const display = hovered ?? rating;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-xs mx-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-900">Rate {partner?.name}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 -mr-1.5"><X size={18} /></button>
        </div>

        <div className="px-5 py-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center font-bold text-2xl text-orange-500 mx-auto">
            {partner?.name?.[0]?.toUpperCase()}
          </div>

          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={s <= display ? "text-amber-400 fill-amber-400" : "text-stone-200 fill-stone-200"}
                />
              </button>
            ))}
          </div>

          <p className="text-stone-500 text-sm">
            {display === 5 ? "Excellent!" : display === 4 ? "Good" : display === 3 ? "Okay" : display === 2 ? "Below average" : "Poor"}
          </p>

          <textarea
            className="input-field resize-none text-sm text-left"
            rows={3}
            placeholder="Share a few words about this delivery (optional)"
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 500))}
          />
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={submit} disabled={loading} className="btn-primary flex-1">
            {loading ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
