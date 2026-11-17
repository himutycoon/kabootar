import { useState } from "react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { Star } from "lucide-react";
import { Sheet } from "./mobile/ui";
import { m } from "./mobile/styles";
import { Avatar } from "./desktop/ui";

const LABELS = { 1: "Poor", 2: "Below average", 3: "Okay", 4: "Good", 5: "Excellent" };

export default function RatingModal({ partner, parcelId, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post(`/parcels/${parcelId}/review`, { rating, comment });
      toast.success(`Thanks — your review of ${partner?.name?.split(" ")[0] || "them"} is posted`);
      onSubmitted?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const display = hovered ?? rating;

  return (
    <Sheet title="Leave a review" onClose={onClose}
      footer={<button type="button" onClick={submit} disabled={loading} className={`${m.btnPrimary} w-full`}>{loading ? "Posting…" : "Post review"}</button>}>
      <div className="text-center">
        <div className="flex justify-center"><Avatar user={partner} size={64} /></div>
        <p className="mt-3 text-[16px] font-semibold text-slate-900">How was your delivery with {partner?.name?.split(" ")[0]}?</p>
        <div className="flex justify-center gap-2 mt-4" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} type="button" role="radio" aria-checked={rating === s} aria-label={`${s} star${s > 1 ? "s" : ""}`}
              onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(null)} onClick={() => setRating(s)}
              className="w-11 h-11 flex items-center justify-center">
              <Star size={34} className={s <= display ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
            </button>
          ))}
        </div>
        <p className="mt-1 text-[14px] font-semibold text-slate-600">{LABELS[display]}</p>
      </div>
      <label htmlFor="review-comment" className="block mt-5 text-[13px] font-semibold text-slate-700 mb-1.5">Your review (optional)</label>
      <textarea id="review-comment" className={m.textarea} rows={3} placeholder="What went well? Anything others should know?"
        value={comment} onChange={e => setComment(e.target.value.slice(0, 500))} />
      <p className="text-xs text-slate-400 text-right mt-1">{comment.length}/500</p>
    </Sheet>
  );
}
