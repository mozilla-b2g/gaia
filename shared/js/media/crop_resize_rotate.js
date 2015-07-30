/* exported cropResizeRotate */
/* global getImageSize */
/* global Downsample */

//
// Given a blob that represents an encoded image, decode the image, crop it,
// rotate it, resize it, encode it again and pass the encoded blob to the
// callback.
//
// If the image includes EXIF orientation information, it will be
// rotated and/or mirrored so that the proper side is up and EXIF
// orientation information will not be needed in the output blob. The
// blob will not include any EXIF data.
//
// The cropRegion argument is optional. If specfied, it should be an
// object with left, top, width and height properties that specify the
// region of interest in the image. These coordinates should be
// specified as if the image has already been rotated and mirrored. If
// this argument is not specified, then no cropping is done and the
// entire image is returned.
//
// The outputSize argument specifies the desired size of the output
// image.  If not specified, then the image is returned full-size. If
// this argument is specified, then it should be an object with width
// and height properties or a single number.  If outputSize is an
// object, then the returned image will have the specified size or
// smaller. If the aspect ratio of the output size does not match the
// aspect ratio of the original image or of the crop region, then the
// largest area of the input region that fits the output size without
// letterboxing will be used. If the output size is larger than the
// crop region, then the output size is reduced to match the crop
// region.
//
// If outputSize is a number, then the #-moz-samplesize media fragment
// will be used, if necessary, to ensure that the input image is
// decoded at the specified size or smaller. Note that this media
// fragment gives only coarse control over image size, so passing a
// number for this argument can result in the image being decoded at a
// size substantially smaller than the specified value. If outputSize
// is a number and a crop region is specified, the image may be
// downsampled and then cropped, further reducing the size of the
// resulting image.
//
// The outputType argument specifies the type of the output image. Legal
// values are "image/jpeg" and "image/png". If not specified, and if the
// input image does not need to be cropped resized or rotated, then it
// will be returned unchanged regardless of the type. If no output type
// is specified and a new blob needs to be created then "image/jpeg" will
// be used. If a type is explicitly specified, and does not match the type
// of the input image, then a new blob will be created even if no other
// changes to the image are necessary.
//
// The optional metadata argument provides a way to pass in image size and
// rotation metadata if you already have it. If this argument is omitted
// or null, getImageSize() will be used to compute the metadata. But if you
// have already called getImageSize() on the blob, you can provide the
// metadata you have and avoid having to reparse the blob.
//
// The callback argument should be a function that expects two arguments.
// If the image is successfully processed, the first argument will be null
// and the second will be a blob.  If there was an error, the first argument
// will be an error message and the second argument will be undefined.
//
// If no cropRegion and no outputSize are specified, if the type of the
// input blob matches the requested outputType, and if the image does not
// require any rotation, then this function will not do any work and will
// simply pass the input blob to the callback.
//
// This function requires other shared JS files:
//
//    shared/js/blobview.js
//    shared/js/media/image_size.js
//    shared/js/media/jpeg_metadata_parser.js
//    shared/js/media/downsample.js
//
function cropResizeRotate(blob, cropRegion, outputSize, outputType,
                          metadata, callback)
{
  'use strict';

  const JPEG = 'image/jpeg';
  const PNG = 'image/png';

  // The 2nd, 3rd, 4th and 5th arguments are optional, so fix things up if we're
  // called with fewer than 6 args. The last argument is always the callback.
  switch (arguments.length) {
  case 2:
    callback = cropRegion;
    cropRegion = outputSize = outputType = metadata = null;
    break;

  case 3:
    callback = outputSize;
    outputSize = outputType = metadata = null;
    break;

  case 4:
    callback = outputType;
    outputType = metadata = null;
    break;

  case 5:
    callback = metadata;
    metadata = null;
    break;

  case 6:
    // everything fine. do nothing here
    break;

  default:
    throw new Error('wrong number of arguments: ' + arguments.length);
  }

  if (cropRegion) { // make a private copy
    cropRegion = {
      left: cropRegion.left,
      top: cropRegion.top,
      width: cropRegion.width,
      height: cropRegion.height
    };
  }

  if (outputSize && typeof outputSize === 'object') { // make a private copy
    outputSize = {
      width: outputSize.width,
      height: outputSize.height
    };
  }
  // If we were passed a metadata object, pass it to gotSize. Otherwise,
  // find the metadata object first and then pass it.
  if (metadata) {
    gotSize(metadata);
  }
  else {
    getImageSize(blob, gotSize, function(msg) { callback(msg); });
  }

  function gotSize(metadata) {
    // This is the full size of the image in the input coordiate system
    var rawImageWidth = metadata.width;
    var rawImageHeight = metadata.height;
    var fullsize = rawImageWidth * rawImageHeight;
    var rotation = metadata.rotation || 0;
    var mirrored = metadata.mirrored || false;

    // Compute the full size of the image in the output coordinate system
    // I.e. if the image is sideways, swap the width and height
    var rotatedImageWidth, rotatedImageHeight;
    if (rotation === 0 || rotation === 180) {
      rotatedImageWidth = rawImageWidth;
      rotatedImageHeight = rawImageHeight;
    }
    else {
      rotatedImageWidth = rawImageHeight;
      rotatedImageHeight = rawImageWidth;
    }

    // If there is no crop region, use the full, rotated image.
    // If there is a crop region, make sure it fits inside the image.
    if (!cropRegion) {
      cropRegion = {
        left: 0,
        top: 0,
        width: rotatedImageWidth,
        height: rotatedImageHeight
      };
    }
    else {
      if (cropRegion.left < 0 || cropRegion.top < 0 ||
          (cropRegion.left + cropRegion.width > rotatedImageWidth) ||
          (cropRegion.top + cropRegion.height > rotatedImageHeight)) {
        callback('crop region does not fit inside image');
        return;
      }
    }

    // If there is no output size, use the size of the crop region.
    // If there is an output size make sure it is smaller than the crop region
    // and then adjust the crop region as needed so that the aspect ratios
    // match
    if (outputSize === null || outputSize === undefined) {
      outputSize = {
        width: cropRegion.width,
        height: cropRegion.height
      };
    }
    else if (typeof outputSize === 'number') {
      if (outputSize <= 0) {
        callback('outputSize must be positive');
        return;
      }

      if (fullsize < outputSize) {
        // If the full size of the image is less than the image decode size
        // limit, then we can decode the image at full size and use the full
        // crop region dimensions as the output size.
        outputSize = {
          width: cropRegion.width,
          height: cropRegion.height
        };
      }
      else {
        // In this case we need to specify an output size that is small
        // enough that we will be forced below to use #-moz-samplesize
        // to downsample the image while decoding it.
        // Note that we base this samplesize computation on the full size
        // of the image, because we have to decode the entire thing even
        // if we are later going to crop it.
        var ds = Downsample.areaAtLeast(outputSize / fullsize);

        // Now that we've figured out how much the full image will be
        // downsampled, scale the crop region to match.
        outputSize = {
          width: ds.scale(cropRegion.width),
          height: ds.scale(cropRegion.height)
        };
      }
    }

    if (!(outputSize.width > 0 && outputSize.height > 0)) {
      callback('outputSize width and height must be positive');
      return;
    }

    // If the outputSize is bigger than the crop region, just adjust
    // the output size to match.
    if (outputSize.width > cropRegion.width) {
      outputSize.width = cropRegion.width;
    }
    if (outputSize.height > cropRegion.height) {
      outputSize.height = cropRegion.height;
    }

    // How much do we have to scale the crop region in X and Y dimensions
    // to match the output size?
    var scaleX = outputSize.width / cropRegion.width;
    var scaleY = outputSize.height / cropRegion.height;

    // We now adjust the crop region to match the output size. For
    // example if the outputSize is 200x200 and the cropRegion is
    // 600x400, then scaleX is .33 and scaleY is .5. In this case we can
    // leave the height of the crop region alone, but we need to reduce
    // the width of the crop region and adjust the left of the crop region

    if (scaleY > scaleX) {   // adjust width of crop region
      var oldCropWidth = cropRegion.width;
      cropRegion.width = Math.round(outputSize.width / scaleY);
      cropRegion.left += (oldCropWidth - cropRegion.width) >> 1;
    }
    else if (scaleX > scaleY) { // adjust height of crop region
      var oldCropHeight = cropRegion.height;
      cropRegion.height = Math.round(outputSize.height / scaleX);
      cropRegion.top += (oldCropHeight - cropRegion.height) >> 1;
    }

    // Make sure the outputType is valid, if one was specified
    if (outputType && outputType !== JPEG && outputType !== PNG) {
      callback('unsupported outputType: ' + outputType);
      return;
    }

    // Now that we've done these computations, we can pause for a moment
    // to see if there is actually any work that needs doing here. If not
    // we can just pass the input blob unchanged through to the callback
    if (rotation === 0 &&                      // No need to rotate
        !mirrored &&                           // or to mirror the image.
        (!outputType ||                        // Don't care about output type
         blob.type === outputType) &&          // or type is unchanged.
        outputSize.width === rawImageWidth &&  // Doesn't need crop or resize.
        outputSize.height == rawImageHeight) {
      callback(null, blob);
      return;
    }

    // The crop region we've been working with so far is in the output
    // coordinate system: it assumes that any required rotation has been done.
    // In order to know exactly which pixels to extract from the image we
    // need to convert to the unrotated, unmirrored input coordinate system.
    var inputCropRegion;

    // First, handle rotation
    switch (rotation) {
      case 180:
      // The image is upside down. The width and height are the same but
      // the top and left have to change.
      inputCropRegion = {
        left: rawImageWidth - cropRegion.left - cropRegion.width,
        top: rawImageHeight - cropRegion.top - cropRegion.height,
        width: cropRegion.width,
        height: cropRegion.height
      };
      break;

      case 90:
      // sideways: swap width and height and adjust top and left
      inputCropRegion = {
        left: cropRegion.top,
        top: rawImageHeight - cropRegion.left - cropRegion.width,
        width: cropRegion.height,
        height: cropRegion.width
      };
      break;

      case 270:
      // sideways: swap width and height and adjust top and left
      inputCropRegion = {
        left: rawImageWidth - cropRegion.top - cropRegion.height,
        top: cropRegion.left,
        width: cropRegion.height,
        height: cropRegion.width
      };
      break;

      default:
      // the crop region is the same in this case
      inputCropRegion = {
        left: cropRegion.left,
        top: cropRegion.top,
        width: cropRegion.width,
        height: cropRegion.height
      };
      break;
    }

    // Next, adjust for mirroring
    if (mirrored) {
      if (rotation === 90 || rotation === 270) {
        inputCropRegion.top =
          rawImageHeight - inputCropRegion.top - inputCropRegion.height;
      }
      else {
        inputCropRegion.left =
          rawImageWidth - inputCropRegion.left - inputCropRegion.width;
      }
    }

    // In order to decode the image, we create a blob:// URL for it
    var baseURL = URL.createObjectURL(blob);

    // Decoding an image takes a lot of memory and we want to minimize that.
    // Gecko allows us to use media fragments with our image URL to specify
    // that we do not want it to decode all of the pixels in the image. The
    // #-moz-samplesize= fragment allows us to specify that JPEG images
    // should be downsampled while being decoded, and this can save a lot of
    // memory.
    var sampledsize;
    var downsample;

    // If we decode the image with a #-moz-samplesize media fragment, both
    // the x and y dimensions are reduced by the sample size, so the total
    // number of pixels is reduced by the square of the sample size.
    if (blob.type === JPEG) {
      // What media fragment can we use to downsample the crop region
      // so that it is as small as possible without being smaller than
      // the output size? We know that the output size and crop
      // region have the same aspect ratio now, so we only have to
      // consider one dimension. If we passed in a single number outputSize
      // up above then we Downsample.areaAtLeast() to compute the outputSize.
      // We should now get the same media fragment value here.
      downsample =
        Downsample.sizeNoMoreThan(outputSize.width / cropRegion.width);

      // And if apply that media fragment to the entire image, how big is
      // the result?
      sampledsize = downsample.scale(rawImageWidth) *
        downsample.scale(rawImageHeight);
    }
    else {
      downsample = Downsample.NONE;
      sampledsize = fullsize;
    }

    // Now add the appropriate media fragments to the url
    var url;
    var resizedWithMediaFragment = false;

    if (sampledsize < fullsize) {
      // Use a #-moz-samplesize media fragment to downsample while decoding
      url = baseURL + downsample;
      resizedWithMediaFragment = true;
    }
    else {
      // No media fragments in this case
      url = baseURL;
    }

    // Now we've done our calculations and we have an image URL to decode
    var offscreenImage = new Image();
    offscreenImage.src = url;
    offscreenImage.onerror = function() {
      callback('error decoding image: ' + url);
    };
    offscreenImage.onload = gotImage;

    // Called when the image has loaded
    function gotImage() {
      // If we used a #-moz-samplesize media fragment on the image url,
      // and we got an image that is smaller than full-size, then we
      // need to reduce the crop region proportionally.
      if (resizedWithMediaFragment) {
        if (offscreenImage.width < rawImageWidth ||
            offscreenImage.height < rawImageHeight) {
          var sampleSizeX = rawImageWidth / offscreenImage.width;
          var sampleSizeY = rawImageHeight / offscreenImage.height;
          inputCropRegion.left =
            Math.round(inputCropRegion.left / sampleSizeX);
          inputCropRegion.top =
            Math.round(inputCropRegion.top / sampleSizeY);
          inputCropRegion.width =
            Math.round(inputCropRegion.width / sampleSizeX);
          inputCropRegion.height =
            Math.round(inputCropRegion.height / sampleSizeY);
        }
      }

      // We've decoded the image now, so create a canvas we can copy it into
      var canvas = document.createElement('canvas');
      var destWidth = canvas.width = outputSize.width;
      var destHeight = canvas.height = outputSize.height;

      // Since we're only using the canvas as a way to encode the image
      // we set this willReadFrequently flag as a hint so that we avoid
      // copying the image data to and from the GPU since we don't do any
      // GPU operations on it
      var context = canvas.getContext('2d', { willReadFrequently: true });

      // If the image needs to be rotated or mirrored we have to establish
      // an appropriate transform on the context
      if (rotation || mirrored) {
        // translate so we're rotating around the center
        context.translate(canvas.width / 2, canvas.height / 2);

        if (mirrored) {
          context.scale(-1, 1);
        }

        // rotate
        switch (rotation) {
        case 90:
          context.rotate(Math.PI / 2);
          destWidth = canvas.height;
          destHeight = canvas.width;
          break;
        case 180:
          context.rotate(Math.PI);
          break;
        case 270:
          context.rotate(-Math.PI / 2);
          destWidth = canvas.height;
          destHeight = canvas.width;
          break;
        }

        // And translate back
        if (rotation === 90 || rotation === 270) {
          // For the 90 and 270 case we swap width and height
          context.translate(-canvas.height / 2, -canvas.width / 2);
        }
        else {
          context.translate(-canvas.width / 2, -canvas.height / 2);
        }
      }

      try {
        // Now we copy the image into the canvas.
        // The image has been loaded, but not decoded yet. If the image file
        // appears to be valid and has valid width and height metadata, then
        // the onload event handler will fire. But if the image is corrupt
        // or too big for gecko to decode with the amount of available
        // memory, then this drawImage() call can fail with an exception.
        context.drawImage(offscreenImage,
                          // What part of the image we're drawing
                          inputCropRegion.left, inputCropRegion.top,
                          inputCropRegion.width, inputCropRegion.height,
                          // And what part of the canvas we're drawing it to
                          0, 0, destWidth, destHeight);
      }
      catch(e) {
        callback('Failed to decode image in cropResizeRotate; ' +
                 'image may be corrupt or too large: ' + e);
        return;
      }
      finally {
        // Once the image has been copied, we can release the decoded image
        // memory and the blob URL.
        offscreenImage.src = '';
        URL.revokeObjectURL(baseURL);
      }

      // Finally, encode the image into a blob
      canvas.toBlob(gotEncodedBlob, outputType || JPEG);

      function gotEncodedBlob(blob) {
        // We have the encoded image but before we pass it to the callback
        // we need to free the canvas.
        canvas.width = canvas.height = 0;
        canvas = context = null;
        callback(null, blob);
      }
    }
  }
}
