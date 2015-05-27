'use strict';
/* global
  CONFIG_MAX_IMAGE_PIXEL_SIZE,
  CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT,
  CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,
  Downsample,
  GestureDetector,
  getImageSize,
  getStorageIfAvailable,
  getUnusedFilename,
  MediaFrame,
  MimeMapper,
  NFC,
  parseJPEGMetadata
*/

navigator.mozL10n.once(function() {
  var activity;         // The activity object we're handling
  var activityData;     // The data sent by the initiating app
  var blob;             // The blob we'll be displaying and maybe saving
  var frame;            // The MediaFrame that displays the image
  var saved = false;    // Did we save the file?
  var storage;          // The DeviceStorage object used for saving
  var title;            // What we call the image in the titlebar and banner

  // Register a handler to receive the Activity object
  navigator.mozSetMessageHandler('activity', handleOpenActivity);

  function $(id) { return document.getElementById(id); }

  // Display the specified blob, unless it is too big to display
  function open(blob) {

    // If the app that initiated this activity wants us to do allow the
    // user to save this blob as a file, and if device storage is available
    // and if there is enough free space, then display a save button.
    if (activityData.allowSave && activityData.filename && checkFilename()) {
      getStorageIfAvailable('pictures', blob.size, function(ds) {
        storage = ds;
        showSaveButton();
      });
    }

    // Figure out how big (in pixels) the image is.
    // For JPEG images, this also gets us the preview image if there is one.
    getImageSize(blob, success, error);

    // Called if we get an image size
    function success(metadata) {
      var pixels = metadata.width * metadata.height;

      //
      // If the image is too big, reject it now so we don't have
      // memory trouble later.
      //
      // CONFIG_MAX_IMAGE_PIXEL_SIZE is maximum image resolution we
      // can handle.  It's from config.js which is generated at build
      // time (see build/application-data.js).
      //
      // For jpeg images, we can downsample while decoding so we can
      // handle images that are quite a bit larger
      //
      var imagesizelimit = CONFIG_MAX_IMAGE_PIXEL_SIZE;
      if (blob.type === 'image/jpeg') {
        imagesizelimit *= Downsample.MAX_AREA_REDUCTION;
      }

      //
      // Even if we can downsample an image while decoding it, we still
      // have to read the entire image file. If the file is particularly
      // large we might also have memory problems. (See bug 1008834: a 20mb
      // 80mp jpeg file will cause an OOM on Tarako even though we can
      // decode it at < 2mp). Rather than adding another build-time config
      // variable to specify the maximum file size, however, we'll just
      // base the file size limit on CONFIG_MAX_IMAGE_PIXEL_SIZE.
      // So if that variable is set to 2M, then we might use up to 12Mb of
      // memory. 2 * 2M bytes for the image file and 4 bytes times 2M pixels
      // for the decoded image. A 4mb file size limit should accomodate
      // most JPEG files up to 12 or 16 megapixels
      //
      var filesizelimit = 2 * CONFIG_MAX_IMAGE_PIXEL_SIZE;

      if (pixels > imagesizelimit || blob.size > filesizelimit) {
        displayError('imagetoobig');
        return;
      }

      // If there was no EXIF preview, or if the image is not very big,
      // display the full-size image.
      if (!metadata.preview || pixels < 512 * 1024) {
        frame.displayImage(blob,
                           metadata.width,
                           metadata.height,
                           null,
                           metadata.rotation,
                           metadata.mirrored);
      }
      else {
        // If we found an EXIF preview, and can determine its size, then
        // we can display it instead of the big image and save a lot of
        // memory.
        parseJPEGMetadata(blob.slice(metadata.preview.start,
                                     metadata.preview.end,
                                     'image/jpeg'),
                          function success(previewmetadata) {
                            //
                            // If we parsed the preview image, add its
                            // dimensions to the metdata.preview
                            // object, and then let the MediaFrame
                            // object display the preview instead of
                            // the full-size image.
                            //
                            metadata.preview.width = previewmetadata.width;
                            metadata.preview.height = previewmetadata.height;
                            frame.displayImage(blob,
                                               metadata.width,
                                               metadata.height,
                                               metadata.preview,
                                               metadata.rotation,
                                               metadata.mirrored);
                          },
                          function error() {
                            //
                            // If we couldn't parse the preview image,
                            // just display full-size.
                            //
                            frame.displayImage(blob,
                                               metadata.width,
                                               metadata.height,
                                               null,
                                               metadata.rotation,
                                               metadata.mirrored);

                          });
      }
    }

    // Called if getImageSize parsing fails.
    function error(msg) {
      //
      // This wasn't a JPEG, PNG, GIF, or BMP image and we can't figure
      // out the size of the image. Without the size, we can't pass the
      // image to MediaFrame.displayImage().
      //
      // XXX: Currently, we know how to get the sizes of all the image
      // types that this activity is registered to handle. If we add new
      // image types to manifest.webapp, then we should update
      // shared/js/media/image_size.js to compute the size or we should
      // add code here to load the image into an offscreen <img> to
      // determine its size (but only if the file size is not too large).
      //
      displayError('imageinvalid');
    }
  }

  function handleOpenActivity(request) {
    activity = request;
    activityData = activity.source.data;

    // Set up the UI, if it is not already set up
    if (!frame) {

      // Hook up the buttons
      $('header').addEventListener('action', done);
      $('save').addEventListener('click', save);

      // And register event handlers for gestures
      frame = new MediaFrame($('frame'), false, CONFIG_MAX_IMAGE_PIXEL_SIZE);

      if (CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH) {
        frame.setMinimumPreviewSize(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,
                                    CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT);
      }

      var gestureDetector = new GestureDetector(frame.container);
      gestureDetector.startDetecting();
      frame.container.addEventListener('dbltap', handleDoubleTap);
      frame.container.addEventListener('transform', handleTransform);
      frame.container.addEventListener('pan', handlePan);
      frame.container.addEventListener('swipe', handleSwipe);

      window.addEventListener('resize', frame.resize.bind(frame));
      if (activityData.exitWhenHidden) {
        window.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            done();
          }
        });
      }

      // Report errors if we're passed an invalid image
      frame.onerror = function invalid() {
        displayError('imageinvalid');
      };
    }

    // Display the filename in the header, if there was one
    title = baseName(activityData.filename || '');
    $('filename').textContent = title;

    blob = activityData.blob;
    open(blob);
    NFC.share(blob, {
      foregroundElement: $('open'),
      backgroundElement: document.body
    });
  }

  function checkFilename() {
    // Hide save button for file names having hidden
    // .gallery/ directories. See Bug 992426
    if (activityData.filename.indexOf('.gallery/') != -1) {
      return false;
    }
    else {
      var dotIdx = activityData.filename.lastIndexOf('.');
      if (dotIdx > -1) {
        var ext = activityData.filename.substr(dotIdx + 1);
        return MimeMapper.guessTypeFromExtension(ext) === blob.type;
      } else {
        return false;
      }
    }
  }

  function displayError(msgid) {
    alert(navigator.mozL10n.get(msgid));
    done();
  }

  function done() {
    activity.postResult({ saved: saved });
    activity = null;
    NFC.unshare();
  }

  function handleDoubleTap(e) {
    var scale;
    if (frame.fit.scale > frame.fit.baseScale) {
      scale = frame.fit.baseScale / frame.fit.scale;
    } else {
      scale = 2;
    }

    frame.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
  }

  function handleTransform(e) {
    frame.zoom(e.detail.relative.scale,
               e.detail.midpoint.clientX,
               e.detail.midpoint.clientY);
  }

  function handlePan(e) {
    frame.pan(e.detail.relative.dx, e.detail.relative.dy);
  }

  function handleSwipe(e) {
    var direction = e.detail.direction;
    var velocity = e.detail.vy;
    if (direction === 'down' && velocity > 2) {
      done();
    }
  }

  function save() {

    // Hides the save button: we can only save once
    hideSaveButton();

    getUnusedFilename(storage, activityData.filename, function(filename) {
      var savereq = storage.addNamed(blob, filename);
      savereq.onsuccess = function() {
        // Remember that it has been saved so we can pass this back
        // to the invoking app
        saved = filename;
        // And tell the user
        showBanner('saved', title);
      };
      savereq.onerror = function(e) {
        // XXX we don't report this to the user because it is hard to
        // localize.
        console.error('Error saving', filename, e);
      };
    });
  }

  function showSaveButton() {
    $('save').classList.remove('hidden');
    // XXX work around bug 870619
    $('filename').textContent = $('filename').textContent;
  }

  function hideSaveButton() {
    $('save').classList.add('hidden');
    // XXX work around bug 870619
    $('filename').textContent = $('filename').textContent;
  }

  function showBanner(msg, title) {
    navigator.mozL10n.setAttributes($('message'), msg, {filename: title});
    $('banner').hidden = false;
    setTimeout(function() {
      $('banner').hidden = true;
    }, 3000);
  }

  // Strip directories and just return the base filename
  function baseName(filename) {
    return filename.substring(filename.lastIndexOf('/') + 1);
  }
});
