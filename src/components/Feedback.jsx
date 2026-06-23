import { useState } from "react";
import { Star, Send, ThumbsUp } from "lucide-react";
import { submitFeedback } from "../services/api";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/components.css";

export function Feedback({ order, onComplete, language }) {
  const t = useTranslation(language);
  const [ratings, setRatings] = useState(order.items.map(() => 0));
  const [hoveredRatings, setHoveredRatings] = useState(order.items.map(() => 0));
  const [overallRating, setOverallRating] = useState(0);
  const [hoveredOverall, setHoveredOverall] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRating = (index, value) => {
    const updated = [...ratings];
    updated[index] = value;
    setRatings(updated);
  };

  const handleHover = (index, value) => {
    const updated = [...hoveredRatings];
    updated[index] = value;
    setHoveredRatings(updated);
  };

  const ratingLabel = (r) => {
    return ["", t("poor"), t("fair"), t("good"), t("great"), t("excellent")][r] || "";
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const feedbackData = {
      orderId: order.id,
      tableNumber: order.tableNumber,
      foodRating: Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length) || overallRating,
      serviceRating: overallRating,
      ambianceRating: overallRating,
      comment,
    };

    await submitFeedback(feedbackData);
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => onComplete(), 2500);
  };

  const allRated = ratings.every((r) => r > 0) && overallRating > 0;

  if (submitted) {
    return (
      <div className="feedback-success">
        <div className="feedback-success-icon">
          <ThumbsUp size={36} />
        </div>
        <h2>{t("thankYou")}</h2>
        <p>{t("feedbackThanks")}</p>
        <div className="stars-display">
          {[1,2,3,4,5].map((s) => (
            <Star
              key={s}
              size={28}
              className={s <= overallRating ? "star-filled" : "star-empty"}
              fill={s <= overallRating ? "#f59e0b" : "none"}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-wrapper">
      <div className="feedback-card">
        <h2 className="feedback-title">{t("howWasExperience")}</h2>
        <p className="feedback-subtitle">{t("feedbackSubtitle")}</p>

        {/* Overall Rating */}
        <div className="overall-rating">
          <p className="rating-label">{t("overallExperience")}</p>
          <div className="stars-row">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setOverallRating(star)}
                onMouseEnter={() => setHoveredOverall(star)}
                onMouseLeave={() => setHoveredOverall(0)}
                className="star-btn large"
              >
                <Star
                  size={32}
                  className={star <= (hoveredOverall || overallRating) ? "star-filled" : "star-empty"}
                  fill={star <= (hoveredOverall || overallRating) ? "#f59e0b" : "none"}
                />
              </button>
            ))}
          </div>
          {overallRating > 0 && (
            <p className="rating-text">{ratingLabel(overallRating)}</p>
          )}
        </div>

        {/* Per-item Ratings */}
        <div className="item-ratings">
          <p className="rating-label">{t("rateEachDish")}</p>
          {order.items.map((item, index) => (
            <div key={item.id || index} className="item-rating-row">
              <img
                src={item.image}
                alt={item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                className="item-rating-img"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop"; }}
              />
              <div className="item-rating-info">
                <p className="item-rating-name">
                  {item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                </p>
                <div className="stars-row small">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(index, star)}
                      onMouseEnter={() => handleHover(index, star)}
                      onMouseLeave={() => handleHover(index, 0)}
                      className="star-btn"
                    >
                      <Star
                        size={20}
                        className={
                          star <= (hoveredRatings[index] || ratings[index])
                            ? "star-filled"
                            : "star-empty"
                        }
                        fill={
                          star <= (hoveredRatings[index] || ratings[index])
                            ? "#f59e0b"
                            : "none"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comment */}
        <div className="feedback-comment">
          <label>{t("additionalComments")}</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("tellUsMore")}
            rows={4}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allRated || submitting}
          className="submit-feedback-btn"
        >
          <Send size={16} />
          {submitting ? t("submitting") : t("submitFeedback")}
        </button>

        {!allRated && (
          <p className="feedback-hint">{t("pleaseRateAll")}</p>
        )}
      </div>
    </div>
  );
}
