/* global $, setView, LAYOUT_MODE, photodb, LazyLoader, Spinner, ImageEditor */
/* global cropResizeRotate, MediaFrame */
/* global CONFIG_MAX_PICK_PIXEL_SIZE, CONFIG_MAX_IMAGE_PIXEL_SIZE */
/* exported Pick */

'use strict';

// XXX: the pick activity could, and probably should be handled with a
// completely different entry point from regular invocations of
// Gallery.  If we can modularize the bootstrap/startup code and the
// thumbnail display code enough that we can use it in both entry
// points, it would probably be better to do it that way.

/*
 *  A pick activity can be in two distinct states:
 *
 *   1) the picking state where the user is browsing thumbnails.
 *      Tapping a thumbnail moves to state 2. Tapping the cancel
 *      button cancels the activity and the app exits.
 *
 *   2) the preview/cropping phase where the user sees a full-screen
 *     image and may have the option to crop it and also sees
 *     cancel and done buttons. Tapping cancel moves back to state 1.
 *     Tapping Done ends the pick activity and the app exits.
 *
 *  This Pick module defines start(), select(), end(), cancel()
 *  and restart() methods to handle these state transitions.
 *  Note that this is not a Pick class, just a module of interacting
 *  functions for managing picks. The gallery code needs to call
 *  Pick.start() and Pick.crop().
 */
var Pick = (function() {
  var request;
  var pickType;
  var pickWidth, pickHeight;
  var pickedFileInfo;
  var pickedFile;
  var cropEditor;

  // Called when we are first start up with the activity request object
  function start(activity) {
    request = activity;
    pickType = request.source.data.type;

    if (request.source.data.width && request.source.data.height) {
      pickWidth = request.source.data.width;
      pickHeight = request.source.data.height;
    }
    else {
      pickWidth = pickHeight = 0;
    }

    setView(LAYOUT_MODE.pick);

    // re-run the font-fit logic when header is visible
    var pickHeading = $('pick-header-title');
    pickHeading.textContent = pickHeading.textContent;

    // Clicking on the pick back button cancels the pick activity.
    $('pick-header').addEventListener('action', cancel);

    // In crop view, the back button goes back to pick view
    $('crop-top').addEventListener('action', restart);

    // In crop view, the Done button crops crops the image and returns
    // it to the invoking app;
    $('crop-done-button').addEventListener('click', end);
  }

  // Called when the user selects a thumbnail in pick mode.
  function select(fileinfo) {
    pickedFileInfo = fileinfo;

    // Do we actually want to allow the user to crop the image?
    var nocrop = request.source.data.nocrop;

    if (nocrop) {
      // If we're not cropping show file name in the title bar
      var fileName = pickedFileInfo.name.split('/').pop();
      $('crop-header').textContent =
        fileName.substr(0, fileName.lastIndexOf('.')) || fileName;
    }

    setView(LAYOUT_MODE.crop);

    // Before the picked image is loaded, the done button is disabled
    // to avoid users picking a black/empty image.
    var doneButton = $('crop-done-button');
    doneButton.disabled = true;

    // We need all of these for cropping the photo:
    //  - ImageEditor to display the crop overlay.
    //  - frame_scripts because it has gesture_detector in it.
    //  - crop_resize_rotate.js scripts for cropResizeRotate().
    LazyLoader.load(['js/frame_scripts.js',
                     'shared/js/media/crop_resize_rotate.js',
                     'js/ImageEditor.js'], gotScripts);

    // When the scripts we need are loaded, load the picked file we need
    function gotScripts() {
      photodb.getFile(pickedFileInfo.name, gotFile);
    }

    // This is called with the file that needs to be cropped
    function gotFile(file) {
      pickedFile = file;
      var previewData = pickedFileInfo.metadata.preview;
      if (!previewData) {
        // If there is no preview at all, this is a small image and
        // it is its own preview. Just crop with the full-size image
        startCrop();
      }
      else if (previewData.filename) {
        // If there is an external preview file, use that. This means that
        // the EXIF preview was not big enough
        var storage = navigator.getDeviceStorage('pictures');
        var getreq = storage.get(previewData.filename);
        getreq.onsuccess = function() {
          startCrop(getreq.result);
        };
        // If we fail to get the preview file, just use the full-size image
        getreq.onerror = function() {
          startCrop();
        };
      }
      else {
        // Otherwise, use the internal EXIF preview.
        // This should be the normal case.
        startCrop(pickedFile.slice(previewData.start,
                                   previewData.end,
                                   'image/jpeg'));
      }

      function startCrop(previewBlob) {
        // Before the user can crop the image we have to create a
        // preview of the image at the correct size and orientation
        // if we do not already have one.
        var blob, metadata, outputSize, useSpinner;

        if (previewBlob) {
          // If there is a preview, use it at full size. If we're using
          // a preview we need to pass the size of the preview, but the
          // EXIF orientation data from the fullsize image.
          blob = previewBlob;
          metadata = {
            width: previewData.width,
            height: previewData.height,
            rotation: pickedFileInfo.metadata.rotation,
            mirrored: pickedFileInfo.metadata.mirrored
          };
          outputSize = null;
          useSpinner = false;
        }
        else {
          // If there is no preview, use the picked file, but specify a maximum
          // size so we don't decode at a size larger than needed.
          blob = pickedFile;
          metadata = pickedFileInfo.metadata;
          var windowSize = window.innerWidth * window.innerHeight *
            window.devicePixelRatio * window.devicePixelRatio;
          outputSize = Math.min(windowSize,
                                CONFIG_MAX_PICK_PIXEL_SIZE ||
                                CONFIG_MAX_IMAGE_PIXEL_SIZE);
          useSpinner = metadata.width * metadata.height > outputSize;
        }

        // Make sure the image is rotated correctly so that it appears
        // right side up in the crop UI. Note that we only display a spinner
        // here if we have to downsample a large image.
        if (useSpinner) {
          Spinner.show();
        }
        cropResizeRotate(blob, null, outputSize, null, metadata,
                         gotRotatedBlob);
      }

      function gotRotatedBlob(error, rotatedBlob) {
        Spinner.hide();
        if (error) {
          console.error('Error while rotating image:', error);
          rotatedBlob = pickedFile;
        }
        cropEditor = new ImageEditor(rotatedBlob, $('crop-frame'), {},
                                     cropEditorReady, true);
      }

      function cropEditorReady() {
        // Enable the done button so that users can finish picking image.
        doneButton.disabled = false;

        // If the initiating app doesn't want to allow the user to crop
        // the image, we don't display the crop overlay. But we still use
        // this image editor to preview the image.
        if (nocrop) {
          // Set a fake crop region even though we won't display it
          // so that hasBeenCropped() works.
          cropEditor.cropOverlayRegion.left = 0;
          cropEditor.cropOverlayRegion.top = 0;
          cropEditor.cropOverlayRegion.right = cropEditor.dest.w;
          cropEditor.cropOverlayRegion.bottom = cropEditor.dest.h;
          return;
        }

        cropEditor.showCropOverlay();
        if (pickWidth) {
          cropEditor.setCropAspectRatio(pickWidth, pickHeight);
        }
        else {
          cropEditor.setCropAspectRatio(); // free form cropping
        }
      }
    }
  }

  function end() {
    // First, figure out what kind of image to return to the requesting app.
    // If the activity request specifically included 'image/jpeg' or
    // 'image/png', then we'll use that type. Otherwise, if a generic
    // 'image/*' was requested (or if an unsupported type was requested)
    // then we use null as the type. This value is passed to
    // cropResizeRotate() and will leave the image unchanged if possible
    // or will use jpeg if changes are needed.
    if (Array.isArray(pickType)) {
      if (pickType.indexOf(pickedFileInfo.type) !== -1) {
        pickType = pickedFileInfo.type;
      }
      else if (pickType.indexOf('image/jpeg') !== -1) {
        pickType = 'image/jpeg';
      }
      else if (pickType.indexOf('image/png') !== -1) {
        pickType = 'image/png';
      }
      else {
        pickType = null; // Return unchanged or convert to JPEG
      }
    }
    else if (pickType === 'image/*') {
      pickType = null;   // Return unchanged or convert to JPEG
    }

    if (pickType && pickType !== 'image/jpeg' && pickType !== 'image/png') {
      pickType = null;   // Return unchanged or convert to JPEG
    }

    // In order to determine the cropRegion and outputSize arguments to
    // cropResizeRotate() below we need to know the actual image size.
    // If the image has EXIF rotation, we need to take that into account.
    var fullImageWidth, fullImageHeight;
    var rotation = pickedFileInfo.metadata.rotation || 0;
    if (rotation === 90 || rotation === 270) {
      fullImageWidth = pickedFileInfo.metadata.height;
      fullImageHeight = pickedFileInfo.metadata.width;
    }
    else {
      fullImageWidth = pickedFileInfo.metadata.width;
      fullImageHeight = pickedFileInfo.metadata.height;
    }

    var cropRegion, cropFraction;

    if (request.source.data.nocrop || !cropEditor.hasBeenCropped()) {
      cropRegion = null;
      cropFraction = 1;
    }
    else {
      // Get the user's crop region from the crop editor
      cropRegion = cropEditor.getCropRegion();
      cropFraction = cropRegion.width * cropRegion.height;

      // Scale to match the actual image size
      cropRegion.left = Math.round(cropRegion.left * fullImageWidth);
      cropRegion.top = Math.round(cropRegion.top * fullImageHeight);
      cropRegion.width = Math.round(cropRegion.width * fullImageWidth);
      cropRegion.height = Math.round(cropRegion.height * fullImageHeight);
    }

    var outputSize;
    if (pickWidth && pickHeight) {
      outputSize = { width: pickWidth, height: pickHeight };
    }
    else {
      // If no desired size is specified, we have to impose some kind of limit
      // so that really big images aren't decoded at full size. If there is no
      // build time configuration that specifies the desired maximum pick size, 
      // check for maximum decode size device can handle based on device memory
      // and set outputsize to MediaFrame.maxImageDecodeSize
      // else we use half of the configured maximum decode size. Pick
      // activities are memory-sensitive because the system app needs to keep
      // both the requesting app and the gallery app alive at once.
      outputSize =
        CONFIG_MAX_PICK_PIXEL_SIZE ||
        MediaFrame.maxImageDecodeSize ||
        CONFIG_MAX_IMAGE_PIXEL_SIZE >> 1;

      // If the pick request specifed a maxFileSizeBytes parameter then
      // we'll use this as a hint for the output size. (We make no guarantee
      // about the file size of the returned blob, but we try to be close)
      // JPEG files typically have about 3 times as many pixels as bytes.
      if (request.source.data.maxFileSizeBytes) {
        var requestOutputSize =
          Math.round(request.source.data.maxFileSizeBytes / cropFraction * 3);
        outputSize = Math.min(outputSize, requestOutputSize);
      }
    }

    // show spinner if cropResizeRotate will decode and modify the image
    if (cropRegion !== null ||
        typeof outputsize === 'object' ||
        outputSize < fullImageWidth * fullImageHeight ||
        pickedFileInfo.metadata.rotation ||
        pickedFileInfo.metadata.mirrored) {
      Spinner.show();
    }

    cropResizeRotate(pickedFile, cropRegion, outputSize, pickType,
                     pickedFileInfo.metadata,
                     function(error, blob) {
                       Spinner.hide();
                       if (error) {
                         console.error('while resizing image: ' + error);
                         blob = pickedFile;
                       }

                       // Finally, return the blob to the invoking app
                       request.postResult({
                         type: blob.type,
                         blob: blob
                       });
                     });
  }

  function cancel() {
    request.postError('pick cancelled');
  }

  // Stop cropping the image and go back to picking mode
  function restart() {
    pickedFileInfo = pickedFile = null;
    if (cropEditor) {
      cropEditor.destroy();
      cropEditor = null;
    }
    setView(LAYOUT_MODE.pick);
  }

  return {
    start: start,
    select: select,
    cancel: cancel,
    restart: restart,
    end: end
  };
}());
