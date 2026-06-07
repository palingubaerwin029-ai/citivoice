const tf = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');
const Jimp = require('jimp');

let model = null;

/**
 * Load the MobileNet model into memory and cache it.
 */
const loadModel = async () => {
  if (!model) {
    console.log("[AI] Loading MobileNet image recognition model...");
    // Load the lightweight MobileNet model
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log("[AI] MobileNet model loaded successfully.");
  }
  return model;
};

/**
 * Analyzes an image and returns a list of detected objects (tags).
 * Uses TensorFlow.js and MobileNet locally (no cloud APIs).
 * 
 * @param {string} filePath - Absolute path to the image file
 * @returns {Promise<string[]>} - Array of detected object labels
 */
const analyzeImage = async (filePath) => {
  try {
    if (!filePath) return [];
    
    const mNet = await loadModel();
    const image = await Jimp.read(filePath);
    
    // Scale image down to max 400x400 to keep tensor processing extremely fast
    image.scaleToFit(400, 400);

    // MobileNet expects a 3D Tensor of shape [height, width, 3] (RGB).
    // Jimp provides image.bitmap.data as an RGBA Uint8Array.
    const numPixels = image.bitmap.width * image.bitmap.height;
    const values = new Int32Array(numPixels * 3);
    
    let i = 0;
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      values[i++] = image.bitmap.data[idx];     // R
      values[i++] = image.bitmap.data[idx + 1]; // G
      values[i++] = image.bitmap.data[idx + 2]; // B
      // Ignore Alpha [idx + 3]
    });

    const tensor = tf.tensor3d(values, [image.bitmap.height, image.bitmap.width, 3], 'int32');
    
    // Run prediction (Top 5 results)
    const predictions = await mNet.classify(tensor, 5);
    
    // Clean up memory
    tensor.dispose(); 

    console.log("[AI] MobileNet raw predictions:", predictions);

    // Flatten classes into a tags array
    let tags = [];
    predictions.forEach(p => {
      // className is often a comma separated list e.g. "street sign, parking meter"
      const names = p.className.split(',').map(n => n.trim().toLowerCase());
      tags.push(...names);
    });

    return tags;
  } catch (err) {
    console.error("[AI] TensorFlow Image Analysis Error:", err);
    return [];
  }
};

module.exports = {
  analyzeImage
};
