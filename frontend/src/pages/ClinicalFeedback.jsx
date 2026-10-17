import React, { useState } from 'react';
import { useFeedback, useSubmitFeedback, useDeleteFeedback } from '../hooks/useFeedback';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/common/SkeletonLoader';

const ClinicalFeedback = () => {
  const [rating, setRating] = useState('5');
  const [comments, setComments] = useState('');

  const { data, isLoading } = useFeedback();
  const submitMutation = useSubmitFeedback();
  const deleteMutation = useDeleteFeedback();
  const { addToast } = useToast();

  const feedbacks = data?.feedbacks || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comments.trim()) {
      addToast('Please provide your clinical notes or suggestion.', 'warning');
      return;
    }

    try {
      await submitMutation.mutateAsync({ rating: Number(rating), comments });
      addToast('Feedback submitted to administrative review queue.', 'success');
      setComments('');
      setRating('5');
    } catch (err) {
      console.error('Feedback submit error:', err);
      addToast('Failed to submit feedback.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      addToast('Feedback entry removed.', 'info');
    } catch (err) {
      console.error('Delete feedback error:', err);
      addToast('Failed to delete feedback entry.', 'error');
    }
  };

  return (
    <div className="container-fluid py-4 px-lg-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-extrabold text-white mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-comment-medical text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            <span>Clinical Feedback & Peer Review</span>
          </h2>
          <p className="text-secondary small mb-0">
            Submit diagnostic observations, platform feedback, and review administrative responses.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Submit Feedback */}
        <div className="col-lg-5">
          <div className="rad-card p-4">
            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <i className="fas fa-pen-nib" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
              <span>Submit Clinical Observation</span>
            </h5>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label extra-small text-muted fw-bold text-uppercase">Diagnostic Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="5">5 Stars - Outstanding Diagnostic Concordance</option>
                  <option value="4">4 Stars - Highly Accurate Saliency Map</option>
                  <option value="3">3 Stars - Acceptable Baseline</option>
                  <option value="2">2 Stars - Borderline / High False Positives</option>
                  <option value="1">1 Star - Model Disagreement / Low Sensitivity</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label extra-small text-muted fw-bold text-uppercase">Observations & Notes</label>
                <textarea
                  rows="4"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide clinical feedback on model sensitivity, Grad-CAM attention regions, or user interface improvements..."
                  className="form-control"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitMutation.isLoading}
                className="glass-btn primary w-100 py-2.5"
              >
                {submitMutation.isLoading ? 'Submitting...' : 'Submit to Quality Queue'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Feedback History */}
        <div className="col-lg-7">
          <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
            <i className="fas fa-history" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
            <span>Observation History ({feedbacks.length})</span>
          </h5>

          {isLoading ? (
            <div className="d-flex flex-column gap-3">
              <SkeletonCard height="80px" />
              <SkeletonCard height="80px" />
            </div>
          ) : feedbacks.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {feedbacks.map((f) => (
                <div key={f._id} className="rad-card p-3.5">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                        style={{ width: '32px', height: '32px', background: 'rgba(57, 255, 20, 0.15)', color: 'var(--lightsaber-green, #39ff14)' }}
                      >
                        <i className="fas fa-user-md"></i>
                      </div>
                      <strong className="text-white small">{f.userId?.name || 'Clinician'}</strong>
                      <span className="badge glass-item border border-warning text-warning extra-small">
                        {f.rating} / 5 ★
                      </span>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <small className="text-secondary extra-small font-monospace">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </small>
                      <button
                        onClick={() => handleDelete(f._id)}
                        className="rad-btn-danger btn-sm p-1 px-2 extra-small"
                        title="Delete entry"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <p className="text-secondary small mb-2">{f.comments || f.message}</p>

                  {f.adminResponse && (
                    <div className="p-2.5 rounded bg-dark border-start border-cyan border-3 mt-2 extra-small">
                      <strong className="text-cyan d-block mb-1" style={{ color: 'var(--rad-cyan)' }}>
                        <i className="fas fa-shield-alt me-1"></i> Admin Response:
                      </strong>
                      <span className="text-light">{f.adminResponse}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rad-card p-5 text-center text-muted">
              <i className="fas fa-comment-slash fs-1 mb-2"></i>
              <p className="small mb-0">No clinical observations logged yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalFeedback;
