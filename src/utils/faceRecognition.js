import * as faceapi from 'face-api.js';
import { logClientError, logClientWarn } from './safeLog';

// 👈 Use TinyFaceDetector for fast browser execution and smaller footprint (~1.9MB)
// Reliable without WebGL errors and ideal for real-time verification.
//
// CRASH-SAFE loader: if the local /models files are missing, the dev server
// returns index.html (starting with <!DOCTYPE html>) instead of JSON, which
// previously crashed face-api.js. This loader first attempts the local URI,
// then transparently falls back to the public GitHub CDN so verification
// NEVER crashes with an "Unexpected token '<'" error.
let faceApiModelsLoaded = false;

// Public GitHub raw release CDN host for reliable fallback loading
const API_MODEL_CDN_URL =
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

export async function loadFaceApiModels(MODEL_URL = '/models') {
  if (faceApiModelsLoaded) return true;

  const loadAll = (baseUrl) =>
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl),
    ]);

  try {
    // Attempt local load first (in /public/models)
    await loadAll(MODEL_URL);
    faceApiModelsLoaded = true;
    return true;
  } catch (localErr) {
    logClientWarn('Local face-api models missing or 404. Falling back to CDN...');
    try {
      // Fallback to CDN so the app NEVER crashes with <!DOCTYPE HTML> error
      await loadAll(API_MODEL_CDN_URL);
      faceApiModelsLoaded = true;
      return true;
    } catch (cdnErr) {
      logClientError('Failed to load face verification models from both local and CDN sources', cdnErr);
      throw new Error('Unable to load face verification neural network.');
    }
  }
}

/**
 * Enhanced Biometric Face Extraction for Profile & Government IDs
 * Detects a single face with landmarks & high accuracy options.
 * Prevents group photo spoofing by rejecting images with multiple faces.
 */
export async function extractAndAlignFace(inputImageElement) {
  // 1. Detect single face with landmarks & high accuracy options
  // TinyFaceDetector options: inputSize controls detection accuracy vs speed
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  const detection = await faceapi
    .detectSingleFace(inputImageElement, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    throw new Error('No clear face detected. Please ensure bright lighting and clear view.');
  }

  // 2. Prevent group photo spoofing
  const allFaces = await faceapi.detectAllFaces(inputImageElement, options);
  if (allFaces.length > 1) {
    throw new Error('Multiple faces detected. Please provide an image with only your face.');
  }

  return detection;
}

/**
 * Compare Profile Photo vs. Driver's License/ID Photo
 * Uses a stricter threshold (< 0.42) for high-confidence document matching.
 */
export async function matchProfileToIDDocument(profileImg, idDocImg) {
  const profileFace = await extractAndAlignFace(profileImg);
  const idFace = await extractAndAlignFace(idDocImg);

  // Calculate Euclidean Distance
  const distance = faceapi.euclideanDistance(
    profileFace.descriptor,
    idFace.descriptor
  );

  // Document matching requires stricter thresholds (< 0.42)
  const MATCH_THRESHOLD = 0.42;
  const isMatch = distance < MATCH_THRESHOLD;

  return {
    isMatch,
    confidenceScore: Math.max(0, Math.round((1 - distance) * 100)),
    distance,
  };
}