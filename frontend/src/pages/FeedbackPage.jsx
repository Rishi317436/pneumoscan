import React, { useState, useEffect } from 'react';
import { feedbackAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FeedbackPage = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [rating, setRating] = useState('5');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await feedbackAPI.getFeedbackList();
      if (res.data.success) {
        setFeedbacks(res.data.feedbacks || []);
      }
    } catch (err) {
      console.error('Fetch feedback error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comments.trim()) {
      setErrorMsg('Please write a comment or suggestion.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await feedbackAPI.submitFeedback({ rating: Number(rating), comments });
      if (res.data.success) {
        setSuccessMsg('Feedback submitted successfully. Thank you!');
        setComments('');
        setRating('5');
        fetchFeedbacks();
      } else {
        setErrorMsg(res.data.message || 'Failed to submit feedback.');
      }
    } catch (err) {
      console.error('Submit feedback error:', err);
      setErrorMsg('Error submitting feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4 text-dark">
        <i className="fas fa-comments me-2 text-primary"></i>Feedback & Reviews
      </h2>

      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm border-0 mb-4">
          <i className="fas fa-check-circle me-2"></i>
          {successMsg}
          <button type="button" className="btn-close" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm border-0 mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errorMsg}
          <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
        </div>
      )}

      <div className="row">
        {/* Left Column: Submit Feedback */}
        <div className="col-md-5 mb-4">
          <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
            <div
              className="card-header bg-primary text-white py-3"
              style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}
            >
              <h5 className="mb-0 fw-bold">
                <i className="fas fa-pen-nib me-2"></i>Submit Feedback
              </h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">Rating</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="fas fa-star text-warning"></i>
                    </span>
                    <select
                      name="rating"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="form-select bg-light"
                      required
                    >
                      <option value="5">5 Stars (Excellent)</option>
                      <option value="4">4 Stars (Good)</option>
                      <option value="3">3 Stars (Average)</option>
                      <option value="2">2 Stars (Poor)</option>
                      <option value="1">1 Star (Very Bad)</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary">Comments</label>
                  <textarea
                    name="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="form-control bg-light"
                    rows="4"
                    placeholder="Share your experience or suggestions..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary w-100 py-2.5 fw-bold"
                  style={{ borderRadius: '0.5rem', backgroundColor: '#0d9488', borderColor: '#0d9488' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Feedback List */}
        <div className="col-md-7">
          <h4 className="fw-bold mb-3 text-secondary">
            <i className="fas fa-history me-2"></i>Previous Feedbacks
          </h4>

          {loading ? (
            <div className="d-flex justify-content-center py-4">
              <div className="spinner-border text-teal" role="status">
                <span className="visually-hidden">Loading feedback...</span>
              </div>
            </div>
          ) : feedbacks.length > 0 ? (
            feedbacks.map((f) => {
              const r = Number(f.rating) || 5;
              const userName = f.userId?.name || user?.name || 'User';

              return (
                <div className="card mb-3 shadow-sm border-0" style={{ borderRadius: '1rem' }} key={f._id}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-circle bg-light text-primary fw-bold d-flex align-items-center justify-content-center me-2"
                          style={{ width: '36px', height: '36px' }}
                        >
                          <i className="fas fa-user"></i>
                        </div>
                        <strong className="text-dark">{userName}</strong>
                      </div>
                      <div className="text-warning">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i key={star} className={`fa${star <= r ? 's' : 'r'} fa-star`}></i>
                        ))}
                      </div>
                    </div>
                    <p className="text-secondary mb-3">{f.comments || f.message || 'No comment provided.'}</p>
                    {f.adminResponse && (
                      <div className="p-3 bg-light border-start border-primary border-3 rounded-end">
                        <div className="d-flex align-items-center mb-1">
                          <i className="fas fa-user-shield text-primary me-2"></i>
                          <span className="fw-bold text-dark small">Admin Response</span>
                        </div>
                        <p className="mb-0 text-secondary small">{f.adminResponse}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card shadow-sm border-0 text-center py-5" style={{ borderRadius: '1rem' }}>
              <div className="card-body">
                <i className="fas fa-comment-slash text-muted mb-3" style={{ fontSize: '3rem' }}></i>
                <p className="text-muted mb-0">No feedback submitted yet. Be the first to share your thoughts!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
