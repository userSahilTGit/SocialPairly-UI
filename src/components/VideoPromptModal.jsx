// src/components/VideoPromptModal.jsx
import React from 'react';

const VIDEO_PROMPTS = [
  "Introduce yourself in 30 seconds.",
  "What are you passionate about?",
  "What would your ideal weekend look like?",
  "What are you looking for in a partner?",
  "Share something that makes you smile."
];

export function VideoPromptModal({ onSelectPrompt, onClose }) {
  return (
    <div className="modern-modal-overlay" onClick={onClose}>
      <div className="prompt-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="prompt-modal-header">
          <h3>Select Video Prompt</h3>
          <p>Choose a prompt question to attach, or upload directly.</p>
        </div>

        <div className="prompt-list-container">
          {/* HIGH CONTRAST: "None" Option Button */}
          <button
            className="prompt-option-btn none-btn"
            onClick={() => onSelectPrompt('None')}
          >
            <span className="icon">📹</span>
            <span className="label">None — Upload Without Prompt</span>
          </button>

          <div className="prompt-divider">
            <span>OR CHOOSE A QUESTION</span>
          </div>

          {/* High Contrast Blue Prompt Buttons */}
          {VIDEO_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              className="prompt-option-btn video-prompt-btn"
              onClick={() => onSelectPrompt(prompt)}
            >
              <span className="icon">📹</span>
              <span className="label">{prompt}</span>
            </button>
          ))}
        </div>

        <button className="prompt-cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default VideoPromptModal;