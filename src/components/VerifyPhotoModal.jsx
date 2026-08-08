import React, { useRef, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';
import * as faceapi from 'face-api.js';
import { X, ScanFace, ShieldCheck, Camera, RefreshCw } from 'lucide-react';
import { extractAndAlignFace, loadFaceApiModels } from '../utils/faceRecognition';

// 👈 Photo verification (Step 5): Client-side face comparison using face-api.js.
// No image bytes are sent to the backend. The live webcam snapshot is compared
// against the user's profile cover photo entirely in the browser. If the faces match,
// the frontend calls POST /api/users/verify-success to award the verified badge.
//
// Modern biometric/fintech-style scanner UI with active visual feedback,
// pre-processing filters, and landmarks overlay.
const VerifyPhotoModal = ({ onClose, onVerified, coverPhotoUrl }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [snapshot, setSnapshot] = useState(null); // data URL of captured frame
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Load face-api.js models from public/models (TinyFaceDetector - lighter & more reliable)
  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      try {
        await loadFaceApiModels('/models');
        if (!cancelled) {
          setModelsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load face-api models', err);
        if (!cancelled) {
          setError('Face verification models failed to load. Please refresh and try again.');
        }
      }
    }
    loadModels();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Start the webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setError('');
    } catch (err) {
      setError('Camera access denied or unavailable. Please allow camera permissions.');
      console.error('Camera error', err);
    }
  }, []);

  useEffect(() => {
    if (modelsLoaded) {
      startCamera();
    }
  }, [modelsLoaded, startCamera]);

  // Capture a still frame from the live video onto a canvas
  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setSnapshot(canvas.toDataURL('image/jpeg', 0.9));
    // Stop the camera once captured (temporarily)
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setCameraActive(false);
  };

  const retake = () => {
    setSnapshot(null);
    setMessage('');
    setError('');
    startCamera();
  };

  // Compare the live snapshot against the cover photo using face-api.js
  const submitVerification = async () => {
    if (!snapshot || !coverPhotoUrl) return;
    setBusy(true);
    setComparing(true);
    setScanning(true);
    setMessage('');
    setError('');
    try {
      // Load both images
      const [snapshotImg, coverImg] = await Promise.all([
        faceapi.bufferToImage(await fetch(snapshot).then(r => r.blob())),
        faceapi.bufferToImage(await fetch(coverPhotoUrl).then(r => r.blob())),
      ]);

      // Use the enhanced biometric extraction pipeline with strict single-face enforcement
      // and high-confidence options (minConfidence: 0.7)
      const [snapshotDetection, coverDetection] = await Promise.all([
        extractAndAlignFace(snapshotImg),
        extractAndAlignFace(coverImg),
      ]);

      const distance = faceapi.euclideanDistance(snapshotDetection.descriptor, coverDetection.descriptor);
      // 👈 Stricter threshold (< 0.42) for high-confidence document matching readiness
      const threshold = 0.42;

      if (distance < threshold) {
        // Faces match — award verified badge via backend
        const res = await api.post('/users/verify-success');
        const data = res.data;
        setMessage(`✅ ${data.message || 'Identity verified successfully!'}`);
        onVerified?.(data);
        setTimeout(() => onClose(), 1500);
      } else {
        setError('Faces do not match. Please ensure you are the same person as your profile photo.');
      }
    } catch (err) {
      console.error('Verification error', err);
      setError(err.response?.data?.message || err.message || 'Verification failed. Please try again.');
    } finally {
      setBusy(false);
      setComparing(false);
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="biometric-modal">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck size={20} className="text-indigo-400" />
            Identity Verification
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Biometric Scanner Frame */}
        <div className="relative w-full flex justify-center mb-4">
          <div className="biometric-scanner-frame">
            {/* Corner brackets for fintech look */}
            <div className="scanner-corner tl" />
            <div className="scanner-corner tr" />
            <div className="scanner-corner bl" />
            <div className="scanner-corner br" />

            {/* Glowing target circle */}
            <div className="face-guide-ring" />

            {/* Webcam / Preview */}
            {snapshot ? (
              <img src={snapshot} alt="Live snapshot" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {/* Overlay states */}
            {!modelsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm bg-black/50">
                Loading verification models...
              </div>
            )}
            {modelsLoaded && !cameraActive && !snapshot && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm bg-black/50">
                Camera loading...
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="biometric-status scanning">
                  <ScanFace size={14} /> Scanning face...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-3">
          {message && (
            <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-3 py-2 border border-green-500/30">
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/30">
              {error}
            </p>
          )}

          <div className="biometric-panel">
            <p className="text-xs text-gray-300 leading-relaxed">
              Position your face clearly in the frame with good lighting. Your snapshot is compared
              to your profile cover photo entirely in your browser to confirm identity.
            </p>
            <p className="text-xs text-indigo-300 mt-2 flex items-center gap-1">
              <ShieldCheck size={12} /> {'High-confidence biometric matching (threshold < 0.42)'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {snapshot ? (
              <>
                <button
                  onClick={retake}
                  disabled={busy}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/50 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> Retake
                </button>
                <button
                  onClick={submitVerification}
                  disabled={busy}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ScanFace size={14} />
                  {comparing ? 'Comparing faces...' : busy ? 'Verifying...' : 'Verify Me'}
                </button>
              </>
            ) : (
              <button
                onClick={captureSnapshot}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Camera size={14} /> Capture Photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPhotoModal;