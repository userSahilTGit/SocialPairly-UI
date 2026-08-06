/**
 * Mock for @mediapipe/selfie_segmentation
 *
 * The real package loads heavy WASM / TF.js model assets at runtime.
 * In the Vite dev-server dependency-optimization phase those assets
 * cannot be resolved, so we provide a lightweight stub that satisfies
 * the API surface used by @tensorflow-models/body-segmentation.
 */

export const VERSION = '0.0.0-mock'

/**
 * Minimal stand-in for the MediaPipe SelfieSegmentation class.
 * Only the methods that body-segmentation calls are implemented.
 */
export class SelfieSegmentation {
  constructor(config) {
    this.config = config || {}
    this._resultsListener = null
    this._options = {}
  }

  setOptions(options) {
    this._options = { ...this._options, ...options }
  }

  onResults(listener) {
    this._resultsListener = listener
  }

  async send(inputs) {
    // No-op: the real implementation would run the segmentation model.
    // We simply invoke the results listener with an empty mask so that
    // downstream code does not break.
    if (this._resultsListener) {
      this._resultsListener({
        image: inputs.image,
        segmentationMask: inputs.image
      })
    }
  }

  async initialize() {
    // No-op
  }

  reset() {
    // No-op
  }

  async close() {
    // No-op
  }
}
