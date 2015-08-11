/*
 * This shared module defines a single ImageUtils object in the global scope.
 *
 * ImageUtils.getSizeAndType() takes a Blob as its argument and
 * returns a Promise. If the promise resolves, the resolve method is
 * passed an object with width, height, and type properties. Width and
 * height specify the width and height of the image in pixels. Type
 * specifies the MIME type of the image. If the promise is rejected,
 * the reject method will be passed a string error message.
 *
 * Supported image types are JPEG, PNG, GIF and BMP. The MIME type
 * strings returned when a promise resolves are "image/jpeg",
 * "image/png", "image/gif", and "image/bmp".
 *
 * If you pass a blob that holds an image of some other type (or a
 * blob that is not an image at all) then promise will be rejected.
 *
 * getSizeAndType() does not decode the image to determine its size
 * because can require large amounts of memory. Instead, it parses the
 * image file to determine its size and typically only needs to read a
 * prefix of the file into memory.
 *
 * getSizeAndType() differs from the getImageSize() function defined
 * in shared/js/media/immage_size.js. That function is similar but
 * also parses EXIF metadata for JPEG images and is only suitable if
 * you need to access EXIF data.
 */
(function(exports) {
  'use strict';
  /* global Promise */

  var ImageUtils = exports.ImageUtils = {};

  // Define constants for the MIME types we use
  const JPEG = 'image/jpeg';
  const PNG = 'image/png';
  const GIF = 'image/gif';
  const BMP = 'image/bmp';

  // Export them
  ImageUtils.JPEG = JPEG;
  ImageUtils.PNG = PNG;
  ImageUtils.GIF = GIF;
  ImageUtils.BMP = BMP;

  ImageUtils.getSizeAndType = function getSizeAndType(imageBlob) {
    if (!(imageBlob instanceof Blob)) {
      console.log('not blob');
      return Promise.reject(new TypeError('argument is not a Blob'));
    }

    return new Promise(function(resolve, reject) {
      if (imageBlob.size <= 16) {
        reject('corrupt image file');
        return;
      }

      // Start off assuming that we'll read the first 32kb of the file
      var bytesToRead = 32 * 1024;

      // But if the blob indicates that this is a PNG, GIF, or BMP, then
      // we can read less since the size information is always close to the
      // start of the file for those formats.
      if (imageBlob.type === PNG ||
          imageBlob.type === GIF ||
          imageBlob.type === BMP) {
        bytesToRead = 512;
      }

      // Try to find the information we want in the first bytes of the file
      findSizeAndType(imageBlob, bytesToRead, success, tryagain);

      // If we got the size and type data, resolve the promise
      function success(data) {
        resolve(data);
      }

      // If we didn't find it, try again for JPEG files
      function tryagain(data) {
        // If we were able to verify that this blob is a jpeg file
        // then we will try again because in JPEG files, the size
        // comes after the EXIF data so if there is a large preview image,
        // the size might be more than 32kb into the file
        if (data.type === JPEG) {
          findSizeAndType(imageBlob, imageBlob.size, success, failure);
        }
        // For all other known image types the type and size data is
        // near the start of the file, if we didn't find it on this first
        // try we need to give up now.
        else {
          reject(data.error);
        }
      }

      // If we didn't find the data even after a second attempt then reject.
      function failure(data) {
        reject(data.error);
      }
    });

    // This is the internal helper function that actually reads the blob
    // and finds type and size information.
    function findSizeAndType(imageBlob, amountToRead, success, failure) {
      var slice = imageBlob.slice(0, Math.min(amountToRead, imageBlob.size));
      var reader = new FileReader();
      reader.readAsArrayBuffer(slice);
      reader.onloadend = function() {
        parseImageData(reader.result);
      };

      function parseImageData(buffer) {
        var header = new Uint8Array(buffer, 0, 16);
        var view = new DataView(buffer);

        if (header[0] === 0x89 &&
            header[1] === 0x50 && /* P */
            header[2] === 0x4e && /* N */
            header[3] === 0x47 && /* G */
            header[4] === 0x0d && /* \r */
            header[5] === 0x0a && /* \n */
            header[6] === 0x1A &&
            header[7] === 0x0a &&
            header[12] === 0x49 && /* I */
            header[13] === 0x48 && /* H */
            header[14] === 0x44 && /* D */
            header[15] === 0x52)   /* R */
        {
          // This is a PNG file
          try {
            success({
              type: PNG,
              width: view.getUint32(16, false),  // 32 bit big endian width
              height: view.getUint32(20, false) // 32 bit big endian height
            });
          }
          catch (ex) {
            failure({ error: ex.toString()});
          }
        }
        else if (header[0] === 0x47 &&   /* G */
                 header[1] === 0x49 &&   /* I */
                 header[2] === 0x46 &&   /* F */
                 header[3] === 0x38 &&   /* 8 */
                 (header[4] === 0x37 ||  /* 7 */
                  header[4] === 0x39) && /* or 9 */
                 header[5] === 0x61)     /* a */
        {
          // This is a GIF file
          try {
            success({
              type: GIF,
              width: view.getUint16(6, true),  // 16-bit little endian width
              height: view.getUint16(8, true)  // 16-big little endian height
            });
          }
          catch (ex) {
            failure({ error: ex.toString() });
          }
        }
        else if (header[0] === 0x42 && /* B */
                 header[1] === 0x4D && /* M */
                 view.getUint32(2, true) === imageBlob.size)
        {
          // This is a BMP file
          try {
            var width, height;

            if (view.getUint16(14, true) === 12) { // check format version
              width = view.getUint16(18, true);  // 16-bit little endian width
              height = view.getUint16(20, true); // 16-bit little endian height
            }
            else { // newer versions of the format use 32-bit ints
              width = view.getUint32(18, true);  // 32-bit little endian width
              height = view.getUint32(22, true); // 32-bit little endian height
            }

            success({
              type: BMP,
              width: width,
              height: height
            });
          }
          catch (ex) {
            failure({ error: ex.toString() });
          }
        }
        else if (header[0] === 0xFF &&
                 header[1] === 0xD8) {
          var value = {
            type: JPEG
          };

          // This is a JPEG file. To find its width and height we need
          // to skip past the EXIF data and find the start of image data.
          try {
            var offset = 2;

            // Loop through the segments of the file until we find an SOF
            // segment with image size or until we reach the end of our data.
            for (;;) {
              // The byte at the current offset should be 0xFF marking
              // the start of a new segment.
              if (view.getUint8(offset) !== 0xFF) {
                failure({ error: 'corrupt JPEG file' });
              }
              var segmentType = view.getUint8(offset + 1);
              var segmentSize = view.getUint16(offset + 2) + 2;

              // If we found an SOF "Start of Frame" segment, we can get
              // the image size from it.
              if ((segmentType >= 0xC0 && segmentType <= 0xC3) ||
                  (segmentType >= 0xC5 && segmentType <= 0xC7) ||
                  (segmentType >= 0xC9 && segmentType <= 0xCB) ||
                  (segmentType >= 0xCD && segmentType <= 0xCF))
              {
                // 16-bit big-endian dimensions, height first
                value.height = view.getUint16(offset + 5, false);
                value.width = view.getUint16(offset + 7, false);
                success(value);
                break;
              }

              // Otherwise, move on to the next segment
              offset += segmentSize;

              // We may not have read the entire file into our array buffer
              // so we have to make sure we have not gone past the end of
              // the buffer before looping again. Note that in this case
              // the object we pass to the failure callback includes the
              // image type. This is a signal to getSizeAndType that it
              // should try again with a larger ArrayBuffer.
              if (offset + 9 > view.byteLength) {
                value.error = 'corrupt JPEG file';
                failure(value);
                break;
              }
            }
          }
          catch (ex) {
            failure({ error: ex.toString() });
          }
        }
        else {
          failure({ error: 'unknown image type' });
        }
      }
    }
  };

  //
  // Given a blob containing an image file, this function returns a
  // Promise that will resolve to a blob for an image file that has
  // the specified width and height. If the blob already has that
  // size, it is returned unchanged. If the image is bigger than the
  // specified size, then it will be shrunk and cropped as necessary
  // to fit the specified dimensions.  If the image is smaller than
  // the specified size, it will be enlarged and cropped to fit. The
  // cropping is done in the same way as with the CSS
  // background-size:cover attribute.
  //
  // If the image is resized and outputType is "image/jpeg" or
  // "image/png" then that type will be used for the resized image. If
  // a JPEG or PNG image is resized and outputType is not specified,
  // then the output image will have the same type as the input image.
  // In all other cases, a resized image will be encoded as a PNG image.
  // Note that when an image does not need to be resized its type is not
  // changed, even if outputType is specified.
  // 'encoderOptions' is passed 'as is' to the 'toBlob' method of canvas:
  //    A Number between 0 and 1 indicating image quality if the requested type
  //    is image/jpeg or image/webp. If this argument is anything else,
  //    the default value for image quality is used.
  ImageUtils.resizeAndCropToCover = function(inputImageBlob,
                                             outputWidth, outputHeight,
                                             outputType, encoderOptions)
  {
    if (!outputWidth || !isFinite(outputWidth) || outputWidth <= 0 ||
        !outputHeight || !isFinite(outputHeight) || outputHeight <= 0) {
      return Promise.reject(new TypeError('invalid output dimensions'));
    }
    outputWidth = Math.round(outputWidth);
    outputHeight = Math.round(outputHeight);

    return ImageUtils.getSizeAndType(inputImageBlob).then(
      function resolve(data) {
        var inputWidth = data.width;
        var inputHeight = data.height;

        // If the image already has the desired size, just return it unchanged
        if (inputWidth === outputWidth && inputHeight === outputHeight) {
          return inputImageBlob;
        }

        // Otherwise, return a promise for the resized image
        return resize(data);
      },
      function reject(error) {
        // If we couldn't determine the image size and type for some
        // reason we are still going to assume that it is a valid image,
        // just one we don't know about. If gecko can decode it we'll
        // use it and won't reject unless gecko refuses it.
        return resize({});
      }
    );

    // Decode the image in an <img> element, resize and/or crop it into a
    // <canvas> and the re-encode it to a blob again. Returns a Promise
    // that resolves to the encoded blob.
    function resize(data) {
      var inputType = data.type;
      var inputWidth = data.width;
      var inputHeight = data.height;

      // Ignore invalid outputType parameters
      if (outputType && outputType !== JPEG && outputType !== PNG) {
        console.warn('Ignoring unsupported outputType', outputType);
        outputType = undefined;
      }

      // Determine the output type if none was specified.
      if (!outputType) {
        if (inputType === JPEG || inputType === PNG) {
          outputType = inputType;
        }
        else {
          outputType = PNG;
        }
      }

      // Get a URL for the image blob so we can ask gecko to decode it.
      var url = URL.createObjectURL(inputImageBlob);

      // If we can downsample the image while decoding it, then add a
      // #-moz-samplesize media fragment to the URL. For large JPEG inputs
      // this can save megabytes of memory.
      var mediaFragment;
      if (inputType === JPEG &&
          inputWidth > outputWidth && inputHeight > outputHeight) {
        // How much would we like to scale the image by while decoding?
        var reduction = Math.max(outputWidth / inputWidth,
                                 outputHeight / inputHeight);
        // Get a media fragment that will downsample the image by up to
        // this amount.
        mediaFragment = ImageUtils.Downsample.sizeNoMoreThan(reduction);
      }
      else {
        mediaFragment = '';
      }

      // The next step is to decode (while possibly downsampling) the
      // image, but that is asynchronous, so we'll have to return a
      // Promise to handle that
      return new Promise(function(resolve, reject) {
        var offscreenImage = new Image();
        offscreenImage.src = url + mediaFragment;

        offscreenImage.onerror = function(e) {
          cleanupImage();
          reject('failed to decode image');
        };

        offscreenImage.onload = function() {
          // The image has been decoded now, so we know its actual size.
          // If getSizeAndType failed, or if we used a media fragment then
          // this may be different than the inputWidth and inputHeight
          // values we used previously.
          var actualWidth = offscreenImage.width;
          var actualHeight = offscreenImage.height;

          // Now figure how much we have to scale the decoded image down
          // (or up) so that it covers the specified output dimensions.
          var widthScale = outputWidth / actualWidth;
          var heightScale = outputHeight / actualHeight;
          var scale = Math.max(widthScale, heightScale);

          // Scaling the output dimensions by this much tells us the
          // dimensions of the crop area on the decoded image
          var cropWidth = Math.round(outputWidth / scale);
          var cropHeight = Math.round(outputHeight / scale);

          // Now center that crop region within the decoded image
          var cropLeft = Math.floor((actualWidth - cropWidth) / 2);
          var cropTop = Math.floor((actualHeight - cropHeight) / 2);

          // Set up the canvas we need to copy the crop region into
          var canvas = document.createElement('canvas');
          canvas.width = outputWidth;
          canvas.height = outputHeight;
          var context = canvas.getContext('2d', { willReadFrequently: true });

          // Copy the image into the canvas
          context.drawImage(offscreenImage,
                            cropLeft, cropTop, cropWidth, cropHeight,
                            0, 0, outputWidth, outputHeight);

          // We're done with the image now: try to release the decoded
          // image memory as fast as we can
          cleanupImage();

          // Now encode the pixels in the canvas as an image blob
          canvas.toBlob(function(blob) {
            // We've got the encoded image in the blob, so we don't need
            // the pixels in the canvas anymore. Try to release that memory
            // right away, too.
            canvas.width = 0;
            resolve(blob);
          }, outputType, encoderOptions);
        };

        function cleanupImage() {
          offscreenImage.onerror = offscreenImage.onload = '';
          offscreenImage.src = '';
          URL.revokeObjectURL(url);
        }
      });
    }
  };

  //
  // This module defines a Downsample object with static
  // methods that return objects representing media fragments for
  // downsampling images while they are decoded. The current implementation
  // is based on the #-moz-samplesize media fragment. But because of
  // problems with that fragment (see bug 1004908) it seems likely that a
  // new syntax or new fragment will be introduced. If that happens, we can
  // just change this module and not have to change anything else that
  // depends on it.
  //
  // The method Downsample.areaAtLeast(scale) returns an object
  // representing a media fragment to use to decode an image downsampled by
  // at least as much as the specified scale.  If you are trying to preview
  // an 8mp image and don't want to use more than 2mp of image memory, for
  // example, you would pass a scale of .25 (2mp/8mp) here, and the
  // resulting media fragment could be appended to the url to make the
  // image decode at a size equal to or smaller than 2mp.
  //
  // The method Downsample.sizeNoMoreThan(scale) returns a media fragment
  // object that you can use to reduce the dimensions of an image as much
  // as possible without exceeding the specified scale. If you have a
  // 1600x1200 image and want to decode it to produce an image that is as
  // small as possible but at least 160x120, you would pass a scale of 0.1.
  //
  // The returned objects have a dimensionScale property that specifies how
  // they affect the dimensions of the image and an areaScale property that
  // specifies how much they affect the area (number of pixels) in an
  // image. (The areaScale is just the square of the scale.) To avoid
  // floating-point rounding issues, the values of these scale properties
  // are rounded to the nearest hundredth.
  //
  // The returned objects also have a scale() method that scales a
  // dimension with proper rounding (it rounds up to the nearest integer
  // just as libjpeg does).
  //
  // Each object also has a toString() method that returns the required
  // media fragment (including the hash mark) so you can simply use
  // string concatentation to append one of these objects to the URL of
  // the image you want to decode.
  //
  // Downsample.NONE is a no-op media fragment object with scale set to
  // 1, and a toString() method that returns the empty string.
  //
  (function(exports) {
    'use strict';  // jshint ignore:line

    // Round to the nearest hundredth to combat floating point rounding errors
    function round(x) {
      return Math.round(x * 100) / 100;
    }

    //
    // A factory method for returning an object that represents a
    // #-moz-samplesize media fragment. The use of Math.ceil() in the
    // scale method is from jpeg_core_output_dimensions() in
    // media/libjpeg/jdmaster.c and jdiv_round_up() in media/libjpeg/jutils.c
    //
    function MozSampleSize(n, scale) {
      return Object.freeze({
        dimensionScale: round(scale),
        areaScale: round(scale * scale),
        toString: function() { return '#-moz-samplesize=' + n; },
        scale: function(x) { return Math.ceil(x * scale); }
      });
    }

    // A fragment object that represents no downsampling with no fragment
    var NONE = Object.freeze({
      dimensionScale: 1,
      areaScale: 1,
      toString: function() { return ''; },
      scale: function(x) { return x; }
    });

    //
    // The five possible #-moz-samplesize values.
    // The mapping from sample size to scale comes from:
    // the moz-samplesize code in /image/decoders/nsJPEGDecoder.cpp and
    // the jpeg_core_output_dimensions() function in media/libjpeg/jdmaster.c
    //
    var fragments = [
      NONE,
      // samplesize=2 reduces size by 1/2 and area by 1/4, etc.
      MozSampleSize(2, 1 / 2),
      MozSampleSize(3, 3 / 8),
      MozSampleSize(4, 1 / 4),
      MozSampleSize(8, 1 / 8)
    ];

    // Return the fragment object that has the largest scale and downsamples the
    // dimensions of an image at least as much as the specified scale.
    // If none of the choices scales enough, return the one that comes closest
    function sizeAtLeast(scale) {
      scale = round(scale);
      for (var i = 0; i < fragments.length; i++) {
        var f = fragments[i];
        if (f.dimensionScale <= scale) {
          return f;
        }
      }
      return fragments[fragments.length - 1];
    }

    // Return the fragment object that downsamples an image as far as possible
    // without going beyond the specified scale. This might return NONE.
    function sizeNoMoreThan(scale) {
      scale = round(scale);
      for (var i = fragments.length - 1; i >= 0; i--) {
        var f = fragments[i];
        if (f.dimensionScale >= scale) {
          return f;
        }
      }
      return NONE;
    }

    // Return the fragment object that has the largest scale and downsamples the
    // area of an image at least as much as the specified scale.
    // If none of the choices scales enough, return the one that comes closest
    function areaAtLeast(scale) {
      scale = round(scale);
      for (var i = 0; i < fragments.length; i++) {
        var f = fragments[i];
        if (f.areaScale <= scale) {
          return f;
        }
      }
      return fragments[fragments.length - 1];
    }

    // Return the fragment object that downsamples the area of an image
    // as far as possible without going beyond the specified scale. This
    // might return NONE.
    function areaNoMoreThan(scale) {
      scale = round(scale);
      for (var i = fragments.length - 1; i >= 0; i--) {
        var f = fragments[i];
        if (f.areaScale >= scale) {
          return f;
        }
      }
      return NONE;
    }

    exports.Downsample = {
      sizeAtLeast: sizeAtLeast,
      sizeNoMoreThan: sizeNoMoreThan,
      areaAtLeast: areaAtLeast,
      areaNoMoreThan: areaNoMoreThan,
      NONE: NONE,
      MAX_SIZE_REDUCTION: 1 / fragments[fragments.length - 1].dimensionScale,
      MAX_AREA_REDUCTION: 1 / fragments[fragments.length - 1].areaScale
    };
  }(exports.ImageUtils));
})(window);
