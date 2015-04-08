/*
 * image_processor.js:
 *
 * This module defines an ImageProcessor class, which provides the image
 * processing primitives required by the Gallery app image editor.
 *
 * When creating an ImageProcessor, you must specify the maximum number
 * of pixels that will be processed in a single batch. When done with
 * an ImageProcessor, call destroy() if you want to immediately deallocate
 * any resources it uses.
 *
 * Use the setGamma() method to specify the value to use for gamma correction.
 * a value of 1.0 leaves the image unmodified.
 *
 * Use the setLevels() method to specify the level parameters used for
 * image auto enhancement. These parameters are usually computed from a
 * histogram and take the form of an object like this:
 *  {
 *    red: { min: 20, max:240 },
 *    green: { min: 30, max:200 },
 *    blue: { min: 0, max:150 },
 *  }
 *
 * Use setMatrix() to specify a 3-row by 4 column matrix used to modify
 * each pixel of the image (for converting to black and white or sepia,
 * for example). The matrix is represented as an array of 12 floating-point
 * numbers.
 *
 * Call processImage() to process pixels using the gamma, levels and matrix
 * previously set with other methods. processImage() expects an ArrayBuffer
 * of pixel data in ImageData format (four bytes per pixel in rgba order).
 * processImage() returns a Promise that resolves to an ArrayBuffer
 * (possibly the same one) when the processing is done.
 *
 * To compute a histogram for an image, call computeHistogram() with an
 * array buffer of rgba pixels. The return value is a Promise that resolves
 * to an array buffer. The returned array buffer is 3kb long and should be
 * interpreted as 3 arrays each with 256 32-bit integers. These arrays hold
 * the counts for the red, green, and blue components.
 *
 * Even though it implements a Promise-based API, ImageProcessor is fully
 * synchronous. The Promises it returns are already resolved.
 *
 * image_processor_thread.js defines an ImageProcessorThread class that
 * implements the same API as ImageProcessor, but does so with asynchronous
 * promises in a different worker thread. For responsiveness, it is
 * generally better to use ImageProcessorThread instead of ImageProcessor.
 *
 * An ImageProcessorThread implements the ImageProcessor API by sending
 * messsages to a Worker. The worker loads image_processor_worker.js which
 * is responsible for receiving the messages sent by image_processor_thread.
 * image_processor_worker.js loads this ImageProcessor class into the
 * worker context where it can run synchronously without affecting UI
 * responsiveness.
 *
 * Finally, note that this ImageProcessor class contains an
 * ImageProcessorEngine module inside of it. This "engine" is a hand-written
 * asm.js module that performs the actual pixel value manipulation much
 * faster than would be possible with regular JavaScript code.
 */
(function(exports) {
  'use strict';

  var global = exports; // window or worker context
  exports.ImageProcessor = ImageProcessor;

  function ImageProcessor(maxpixels) {
    // If we're being called directly, then we get maxpixels and initialize now.
    // Otherwise, if we're being used in a worker, then the initialize call
    // will arrive separately.
    if (maxpixels) {
      this.initialize(maxpixels);
    }
  }

  // We do this in a separate method because we have to do this in a worker, too
  ImageProcessor.prototype.initialize = function(maxpixels) {
    this.maxpixels = maxpixels;
    this.hasNewParams = true;
    this.engine = null;
    this.params = {};
    this.setGamma(1.0);
    this.setLevels(null);
    this.setMatrix(null);
  };

  ImageProcessor.prototype.destroy = function() {
    // ImageProcessorThread needs this method, so we define it here, too.
  };

  ImageProcessor.prototype.setGamma = function setGamma(gamma) {
    this.params.gamma = gamma || 1.0;
    this.hasNewParams = true;
  };

  // This could be generalized to take three 256-byte arrays for
  // completely general value mapping.
  ImageProcessor.prototype.setLevels = function setLevels(levels) {
    if (levels) {
      this.params.hasLevels = true;
      this.params.rmin = levels.red.min;
      this.params.rmax = levels.red.max;
      this.params.gmin = levels.green.min;
      this.params.gmax = levels.green.max;
      this.params.bmin = levels.blue.min;
      this.params.bmax = levels.blue.max;
    }
    else {
      this.params.hasLevels = false;
      // these default values will cause no level correction to be done
      this.params.rmin = 0;
      this.params.rmax = 0;
      this.params.gmin = 0;
      this.params.gmax = 0;
      this.params.bmin = 0;
      this.params.bmax = 0;
    }

    this.hasNewParams = true;
  };

  ImageProcessor.prototype.setMatrix = function setMatrix(matrix) {
    if (matrix) {
      this.params.hasMatrix = true;
      this.params.m0 = matrix[0];
      this.params.m1 = matrix[1];
      this.params.m2 = matrix[2];
      this.params.m3 = matrix[3];
      this.params.m4 = matrix[4];
      this.params.m5 = matrix[5];
      this.params.m6 = matrix[6];
      this.params.m7 = matrix[7];
      this.params.m8 = matrix[8];
      this.params.m9 = matrix[9];
      this.params.m10 = matrix[10];
      this.params.m11 = matrix[11];
    }
    else {
      this.params.hasMatrix = false;
      this.params.m0 = 0;
      this.params.m1 = 0;
      this.params.m2 = 0;
      this.params.m3 = 0;
      this.params.m4 = 0;
      this.params.m5 = 0;
      this.params.m6 = 0;
      this.params.m7 = 0;
      this.params.m8 = 0;
      this.params.m9 = 0;
      this.params.m10 = 0;
      this.params.m11 = 0;
    }

    this.hasNewParams = true;
  };

  ImageProcessor.prototype.processImage = function processImage(pixelBuffer) {
    // If this is a no-op, just return right away
    if (this.params.gamma === 1.0 &&
        !this.params.hasLevels &&
        !this.params.hasMatrix) {
      return Promise.resolve(pixelBuffer);
    }

    if (this.hasNewParams) {
      this.setParams();
    }

    // These are the pixels that were passed in
    var pixels = new Uint8Array(pixelBuffer);

    // This is the array we have to copy the pixels into so that the
    // asm.js processor can manipulate them.
    var heapPixels = new Uint8Array(this.heap,
                                    ImageProcessorEngine.pixelOffset,
                                    pixels.length);

    // Copy the input pixels onto the asm.js heap
    heapPixels.set(pixels);

    // Process the pixels with our asm.js module
    this.engine.process(heapPixels.length,
                        this.params.hasLevels || this.params.gamma !== 1.0,
                        this.params.hasMatrix);

    // Copy the processed pixels from the heap back to the local array
    pixels.set(heapPixels);

    return Promise.resolve(pixelBuffer);
  };

  ImageProcessor.prototype.computeHistogram = function(pixelBuffer) {
    var pixels = new Uint8Array(pixelBuffer);
    var histogramBuffer = new ArrayBuffer(3 * 4 * 256);
    var red = new Uint32Array(histogramBuffer, 0, 256);
    var green = new Uint32Array(histogramBuffer, 4 * 256, 256);
    var blue = new Uint32Array(histogramBuffer, 8 * 256, 256);

    // Compute a histogram of the image
    // There is not an asm.js version of this becasue it is fast
    // enough just like this, especially since we compute the
    // histogram of the preview image, not the full-size image.
    for(var i = 0; i < pixels.length; i += 4) {
      red[pixels[i]]++;
      green[pixels[i+1]]++;
      blue[pixels[i+2]]++;
    }
    return Promise.resolve(histogramBuffer);
  };

  ImageProcessor.prototype.setParams = function setParams() {
    if (!this.engine) {
      this.createEngine();
    }

    var p = this.params;

    this.engine.setParams(p.gamma,
                          p.rmin, p.rmax,
                          p.gmin, p.gmax,
                          p.bmin, p.bmax,
                          p.hasMatrix,
                          p.m0, p.m1, p.m2, p.m3,
                          p.m4, p.m5, p.m6, p.m7,
                          p.m8, p.m9, p.m10, p.m11);

    this.hasNewParams = false;
  };

  ImageProcessor.prototype.createEngine = function createEngine() {
    var heapSize = ImageProcessorEngine.computeHeapSize(this.maxpixels);
    this.heap = new ArrayBuffer(heapSize);
    this.engine = ImageProcessorEngine(global, null, this.heap);
  };

  /*
   * This asm.js module does the actual manipulation of pixels.
   * asm.js is giving us a significant speed boost here, so be extra
   * careful when editing this code to make sure that it still compiles
   * correctly as an asm.js module.
   */
  function ImageProcessorEngine(stdlib, foreign, heap) {
    'use asm';

    const bytes = new stdlib.Uint8Array(heap);

    const min = stdlib.Math.min;
    const max = stdlib.Math.max;
    const pow = stdlib.Math.pow;

    const GAMMA = 0x0000; // Offsets into the heap
    const RED   = 0x0100;
    const GREEN = 0x0200;
    const BLUE  = 0x0300;
    const M0    = 0x0400;
    const M1    = 0x0500;
    const M2    = 0x0600;
    const M3    = 0x0700;
    const M4    = 0x0800;
    const M5    = 0x0900;
    const M6    = 0x0A00;
    const M7    = 0x0B00;
    const M8    = 0x0C00;
    const M9    = 0x0D00;
    const M10   = 0x0E00;
    const M11   = 0x0F00;
    const PX    = 0x1000; // pixels go here

    // In setLevels, if the max-min range is smaller than this, then we
    // assume that the image is not actually a photo and we don't adjust.
    const LEVELS_THRESHOLD = 25.0;

    function process(numbytes, doLevelsOrGamma, doMatrix) {
      numbytes = numbytes | 0;
      doLevelsOrGamma = doLevelsOrGamma | 0;
      doMatrix = doMatrix | 0;

      var i = 0;
      var r = 0, g = 0, b = 0;
      var r2 = 0, g2 = 0, b2 = 0;

      for(i = 0; (i|0) < (numbytes|0); i = (i + 4)|0) {

        // Read the raw red, green and blue values
        r = bytes[(PX+i)|0]|0;
        g = bytes[(PX+i+1)|0]|0;
        b = bytes[(PX+i+2)|0]|0;

        // If we have gamma correction or auto levels, do that now
        if ((doLevelsOrGamma|0) == 1) {
          r = bytes[((RED|0) + (r|0))|0] | 0;
          g = bytes[((GREEN|0) + (g|0))|0] | 0;
          b = bytes[((BLUE|0) + (b|0))|0] | 0;
        }

        // Color filter, if there is one specified.
        if ((doMatrix|0) == 1) {
          r2 = ((bytes[(M0+r)|0]|0) + (bytes[(M1+g)|0]|0) +
                (bytes[(M2+b)|0]|0) + (bytes[M3]|0))|0;

          g2 = ((bytes[(M4+r)|0]|0) + (bytes[(M5+g)|0]|0) +
                (bytes[(M6+b)|0]|0) + (bytes[M7]|0))|0;

          b2 = ((bytes[(M8+r)|0]|0) + (bytes[(M9+g)|0]|0) +
                (bytes[(M10+b)|0]|0) + (bytes[M11]|0))|0;

          r = min(max(r2|0, 0), 255);
          g = min(max(g2|0, 0), 255);
          b = min(max(b2|0, 0), 255);
        }

        // store the values back into the image
        bytes[(PX+i)|0]   = r;
        bytes[(PX+i+1)|0] = g;
        bytes[(PX+i+2)|0] = b;
      }
    }
    function setParams(gamma,
                       rmin, rmax, gmin, gmax, bmin, bmax,
                       hasMatrix,
                       m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11) {

      gamma = +gamma;

      rmin = +rmin;
      rmax = +rmax;
      gmin = +gmin;
      gmax = +gmax;
      bmin = +bmin;
      bmax = +bmax;

      hasMatrix = hasMatrix|0;
      m0 = +m0;
      m1 = +m1;
      m2 = +m2;
      m3 = +m3;
      m4 = +m4;
      m5 = +m5;
      m6 = +m6;
      m7 = +m7;
      m8 = +m8;
      m9 = +m9;
      m10 = +m10;
      m11 = +m11;

      setGamma(gamma);
      setLevels(rmin, rmax, RED);
      setLevels(gmin, gmax, GREEN);
      setLevels(bmin, bmax, BLUE);

      if ((hasMatrix|0) == 1) {
        setMatrix(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11);
      }
    }

    function setGamma(gamma) {
      gamma = +gamma;
      var i = 0;
      var x = 0.0, y=0.0;

      while((i|0) < 256) {
        y = pow(x / 255.0, gamma);
        y = 255.0 * y;
        y = y + 0.5;
        bytes[(GAMMA + i)|0] = ~~y;  // float to int
        i = (i + 1)|0;
        x = x + 1.0;
      }
    }

    function setMatrix(m0, m1, m2, m3,
                       m4, m5, m6, m7,
                       m8, m9, m10, m11)
    {
      m0 = +m0;
      m1 = +m1;
      m2 = +m2;
      m3 = +m3;
      m4 = +m4;
      m5 = +m5;
      m6 = +m6;
      m7 = +m7;
      m8 = +m8;
      m9 = +m9;
      m10 = +m10;
      m11 = +m11;

      var i = 0, x = 0.0;
      while((i|0) < 256) {

        bytes[(M0 + i)|0] = ~~(m0 * x + 0.5);
        bytes[(M1 + i)|0] = ~~(m1 * x + 0.5);
        bytes[(M2 + i)|0] = ~~(m2 * x + 0.5);

        bytes[(M4 + i)|0] = ~~(m4 * x + 0.5);
        bytes[(M5 + i)|0] = ~~(m5 * x + 0.5);
        bytes[(M6 + i)|0] = ~~(m6 * x + 0.5);

        bytes[(M8 + i)|0] = ~~(m8 * x + 0.5);
        bytes[(M9 + i)|0] = ~~(m9 * x + 0.5);
        bytes[(M10 + i)|0] = ~~(m10 * x + 0.5);

        // constants, no table needed
        bytes[M3] = ~~(m3 * 255.0 + 0.5);
        bytes[M7] = ~~(m7 * 255.0 + 0.5);
        bytes[M11] = ~~(m11 * 255.0 + 0.5);

        i = (i + 1) | 0;
        x = x + 1.0;
      }
    }

    // This creates tables that already have gamma correction applied.
    function setLevels(min, max, offset) {
      min = +min;
      max = +max;
      offset = offset | 0;

      var i = 0, x = 0.0;
      var imin = 0;
      var imax = 0;
      var range = 0.0;
      var factor = 1.0;
      var value = 0;

      range = max - min;
      imin = ~~min;
      imax = ~~max;

      if (range < LEVELS_THRESHOLD) {
        // If the pixels are all in a narrow range, this is probably not a
        // photograph and we shouldn't try to modify it.
        while((i|0) < 256) {
          bytes[(offset+i)|0] = bytes[(GAMMA+i)|0];
          i = (i + 1)|0;
        }
      }
      else {
        // Otherwise, spread the pixels out so min goes to 0 and max to 255
        factor = 255.0 / range; // Pre-compute so we only have to divide once

        while((i|0) < 256) {
          if ((i|0) <= (imin|0)) {
            value = 0;
          }
          else if ((i|0) >= (imax|0)) {
            value = 255;
          }
          else {
            value = ~~((x - min) * factor + 0.5);
          }

          bytes[(offset+i)|0] = bytes[(GAMMA+value)|0];

          i = (i + 1)|0;
          x = x + 1.0;
        }
      }
    }

    return {
      setParams: setParams,
      process: process
    };
  }

  ImageProcessorEngine.gammaOffset = 0x0000;
  ImageProcessorEngine.redOffset = 0x0100;
  ImageProcessorEngine.greenOffset = 0x0200;
  ImageProcessorEngine.blueOffset = 0x0300;
  ImageProcessorEngine.matrixOffset = 0x0400;
  ImageProcessorEngine.pixelOffset = 0x1000;

  ImageProcessorEngine.computeHeapSize = function(maxPixels) {
    // This is the number of bytes we need
    var numbytes = maxPixels * 4 + ImageProcessorEngine.pixelOffset;

    // But we need to round it up to the nearest power of two.
    // (Or a multiple of 16mb, but I assume we won't go that high)
    numbytes = 1 << Math.ceil(Math.log(numbytes) * Math.LOG2E);

    // And we need to allocate at least 64kb
    return Math.max(numbytes, 64 * 1024);
  };
}(this));
