// This worker is part of the gallery's image editor. It performs the neccessary
// calculations tp provide an input value for the image editor's WebGL shader to
// auto enhance an image.
// The idea behind the alogrithm can be read at
// http://www.ipol.im/pub/art/2011/llmps-scb/

self.addEventListener('message', function(message) {

  var pixels = message.data;
  var red = new Int32Array(256);
  var green = new Int32Array(256);
  var blue = new Int32Array(256);

  // Percentage of upper/lower amount of histogram values that will be ignored.
  // This is done to filter any single values that would otherwise slighty
  // distort the result.
  const LOWER_SATURATION = 0.01,
        UPPER_SATURATION = 0.02,
        MIN_RANGE_TO_ENHANCE = 50;

  createHistogram();
  self.postMessage(getMinMaxHistogramValues());

  // Create a regular histogram of the color values.
  function createHistogram() {
    for (var i = 0; i < pixels.length; i += 4) {
      red[pixels[i]]++;
      green[pixels[i + 1]]++;
      blue[pixels[i + 2]]++;
      //alpha[pixels[i + 3]]++;
    }
  }

  // Find the minmum and maxmium color value of each RGB channel.
  // These min/max will later be strechted to 0.0/1.0 to
  // enrich an image's colors.
  function getMinMaxHistogramValues() {

    // Devide by 4 to only get the amount of pixels for a single channel
    var numPixels = pixels.length / 4;
    // The threshold represent the number of pixels that should be ignored for
    // determining the min/max color value. These pixels are ignore to account
    // for extreme spikes in the color distribtuion along the outer edge of the
    // histogram, as caused by dirt on the lense, bad cameras etc.
    var lowerThreshold = Math.ceil(numPixels * LOWER_SATURATION);
    var upperThreshold = Math.ceil(numPixels * UPPER_SATURATION);

    var
      minRed = getMinimumColor(red, lowerThreshold),
      minGreen = getMinimumColor(green, lowerThreshold),
      minBlue = getMinimumColor(blue, lowerThreshold),
      maxRed = getMaximumColor(red, upperThreshold),
      maxGreen = getMaximumColor(green, upperThreshold),
      maxBlue = getMaximumColor(blue, upperThreshold);

    // It only makes sense to enhance a channel if its range between min and
    // max is big enough. Especially so in the case of solid colored images.
    if (maxRed - minRed < MIN_RANGE_TO_ENHANCE) {
      minRed = 0;
      maxRed = 255;
    }
    if (maxGreen - minGreen < MIN_RANGE_TO_ENHANCE) {
      minGreen = 0;
      maxGreen = 255;
    }
    if (maxBlue - minBlue < MIN_RANGE_TO_ENHANCE) {
      minBlue = 0;
      maxBlue = 255;
    }

    // Return a 3x3 matrix so it can be used as input for a shader.
    // Value range for shader colors is 0.0 - 1.0.
    return [
      minRed / 255, minGreen / 255, minBlue / 255, // first column
      maxRed / 255, maxGreen / 255, maxBlue / 255, // second column
      0, 0, 0];  // third column (useless so far)
  }

  // Returns the smallest RGB color value of the histogram.
  // (excluding the predetermined amount as mentioned above)
  function getMinimumColor(values, threshold) {
    var sum = 0;
    for (var i = 0; i < values.length; i++) {
      sum += values[i];
      if (sum > threshold)
        return i;
    }

    // This should never happen if the histogram and threshold are valid.
    return 0;
  }

  // Returns the highest RGB color value of the histogram.
  // (excluding the predetermined amount as mentioned above)
  function getMaximumColor(values, threshold) {
    var sum = 0;
    for (var i = 255; i > 0; i--) {
      sum += values[i];
      if (sum > threshold)
        return i;
    }

    // This should never happen if the histogram and threshold are valid.
    return 255;
  }
});
