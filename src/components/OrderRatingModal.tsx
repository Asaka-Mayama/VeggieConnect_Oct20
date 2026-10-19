import React, { useState } from 'react';
import { Star, X, CheckCircle2, Sprout, ThumbsUp } from 'lucide-react';
import { Order } from '../types';

interface OrderRatingModalProps {
  order: Order;
  onClose: () => void;
  onSubmitRating: (orderId: string, rating: number, comment: string, freshness: string) => void;
}

export const OrderRatingModal: React.FC<OrderRatingModalProps> = ({
  order,
  onClose,
  onSubmitRating,
}) => {
  const [rating, setRating] = useState<number>(order.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [freshness, setFreshness] = useState<string>('Crisp & Fresh');
  const [comment, setComment] = useState<string>(order.reviewComment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSubmitRating(order.id, rating, comment.trim(), freshness);
    setIsSubmitting(false);
    onClose();
  };

  const freshnessOptions = [
    'Crisp & Fresh',
    'Good Quality',
    'Fair Condition',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-emerald-200 rounded-3xl w-full max-w-sm max-h-[92%] overflow-y-auto p-5 space-y-4 text-emerald-950 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center hover:bg-emerald-100 cursor-pointer transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 pt-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
            <Sprout className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-emerald-950 font-display">Rate Your Harvest</h2>
          <p className="text-xs text-neutral-500">
            Order #{order.id} · {order.farmName}
          </p>
        </div>

        {/* Produce Items Summary */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1 text-xs text-emerald-900">
          <span className="font-semibold block text-[11px] uppercase tracking-wider text-emerald-700">Delivered Crops:</span>
          <p className="font-medium text-neutral-700 truncate">
            {order.items.map((it) => `${it.quantity} ${it.unit} ${it.produceName}`).join(', ')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating Selector */}
          <div className="text-center space-y-2">
            <label className="text-xs font-semibold text-neutral-700 block">
              Overall Quality Score
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer transition-transform active:scale-110"
                    aria-label={`${star} Stars`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isActive
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'fill-neutral-100 text-neutral-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-bold text-amber-700">
              {rating === 5 && 'Outstanding Freshness (5/5)'}
              {rating === 4 && 'Great Quality & Value (4/5)'}
              {rating === 3 && 'Standard Average (3/5)'}
              {rating === 2 && 'Needs Improvement (2/5)'}
              {rating === 1 && 'Unsatisfactory Harvest (1/5)'}
            </p>
          </div>

          {/* Freshness Badge Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 block">
              Produce Freshness Condition
            </label>
            <div className="grid grid-cols-3 gap-2">
              {freshnessOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFreshness(opt)}
                  className={`py-2 px-1 text-center rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                    freshness === opt
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 block">
              Buyer Review & Feedback (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="E.g., Very crisp, delivered fast! Farm-gate price was very fair."
              rows={3}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-3 rounded-2xl border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-100 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Submit Review</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
