window.addEventListener('localized', function() {
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

  // If the image is bigger than this, decoding it will take too much
  // memory, and we don't want to cause an OOM, so we won't display it.
  //
  // XXX: see bug 847060: we ought to be able to handle images bigger
  // than 5 megapixels. But I'm getting OOMs on 8mp images, so I'm
  // keeping this small.
  //
  var MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  // If we can't figure out the image size in megapixels, then we have to base
  // our decision whether or not to display it on the file size. Note that
  // this is a very, very imperfect test. imagesize.js has code to determine
  // the image size for jpeg, png and gif images, so we only have to use this
  // file size test for other image formats.
  var MAX_FILE_SIZE = .5 * 1024 * 1024;

  function handleOpenActivity(request) {
    activity = request;
    activityData = activity.source.data;

    // Set up the UI, if it is not already set up
    if (!frame) {
      // Hook up the buttons
      $('back').addEventListener('click', done);
      $('save').addEventListener('click', save);

      // And register event handlers for gestures
      frame = new MediaFrame($('frame'), false);

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

      // Report errors if we're passed an invalid image
      frame.onerror = function invalid() {
        displayError('imageinvalid');
      };
    }

    // Display the filename in the header, if there was one
    title = baseName(activityData.filename || '');
    $('filename').textContent = title;

    // Start off with the Save button hidden.
    // We'll enable it below in the open() function if needed.
    $('menu').hidden = true;

    blob = activityData.blob;
    open(blob);
  }

  // Display the specified blob, unless it is too big to display
  function open(blob) {

    // If the app that initiated this activity wants us to do allow the
    // user to save this blob as a file, and if device storage is available
    // and if there is enough free space, then display a save button.
    if (activityData.allowSave && activityData.filename && checkFilename()) {
      getStorageIfAvailable('pictures', blob.size, function(ds) {
        storage = ds;
        $('menu').hidden = false;
      });
    }

    // Figure out how big (in pixels) the image is.
    // For JPEG images, this also gets us the preview image if there is one.
    getImageSize(blob, success, error);

    // Called if we get an image size
    function success(metadata) {
      var pixels = metadata.width * metadata.height;

      // If the image is too large, display an error
      if (pixels > MAX_IMAGE_SIZE) {
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
                            // If we parsed the preview image, add its
                            // dimensions to the metdata.preview
                            // object, and then let the MediaFrame
                            // object display the preview instead of
                            // the full-size image.
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
                            // If we couldn't parse the preview image,
                            // just display full-size.
                            frame.displayImage(blob,
                                               metadata.width,
                                               metadata.height);
                          });
      }
    }

    // Called when metadata parsing fails.
    function error(msg) {
      //
      // This wasn't a JPEG, PNG, or GIF image.
      //
      // If the file size isn't too large, try to display it anyway,
      // and then display an error message if the frame.onerror
      // function gets called.
      //
      if (blob.size < MAX_FILE_SIZE) {
        frame.displayImage(blob);
      }
      else {
        displayError('imagetoobig');
      }
    }
  }

  function checkFilename() {
    var dotIdx = activityData.filename.lastIndexOf('.');
    if (dotIdx > -1) {
      var ext = activityData.filename.substr(dotIdx + 1);
      return MimeMapper.guessTypeFromExtension(ext) === blob.type;
    } else {
      return false;
    }
  }

  function displayError(msgid) {
    alert(navigator.mozL10n.get(msgid));
    done();
  }

  function done() {
    activity.postResult({ saved: saved });
    activity = null;
  }

  function handleDoubleTap(e) {
    var scale;
    if (frame.fit.scale > frame.fit.baseScale)
      scale = frame.fit.baseScale / frame.fit.scale;
    else
      scale = 2;

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
    if (direction === 'down' && velocity > 2)
      done();
  }

  function save() {
    // Hide the menu that holds the save button: we can only save once
    $('menu').hidden = true;
    // XXX work around bug 870619
    $('filename').textContent = $('filename').textContent;

    getUnusedFilename(storage, activityData.filename, function(filename) {
      var savereq = storage.addNamed(blob, filename);
      savereq.onsuccess = function() {
        // Remember that it has been saved so we can pass this back
        // to the invoking app
        saved = filename;
        // And tell the user
        showBanner(navigator.mozL10n.get('saved', { filename: title }));
      };
      savereq.onerror = function(e) {
        // XXX we don't report this to the user because it is hard to
        // localize.
        console.error('Error saving', filename, e);
      };
    });
  }

  function showBanner(msg) {
    $('message').textContent = msg;
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
