window.addEventListener('localized', function() {
  var activity;
  var frame;
  navigator.mozSetMessageHandler('activity', handleOpenActivity);

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

  function handleOpenActivity(activity_request) {
    activity = activity_request;

    // Set up the UI, if it is not already set up
    if (!frame) {
      frame = new MediaFrame(document.getElementById('open-frame'), false);

      var backButton = document.getElementById('open-back-button');
      var toolbar = document.getElementById('open-toolbar');
      var gestureDetector = new GestureDetector(frame.container);

      // Set up events
      backButton.addEventListener('click', done);

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

    // When an image file is received via bluetooth, we're invoked
    // by the system app. But the blob that is passed has a very large
    // invalid size field. See bug 850941. As a workaround, we use
    // the filename that is passed along with the blob and look the file
    // up via device storage.  When bug 850941 is fixed, we can remove
    // this code and replace it with open(blob);
    var blob = activity.source.data.blob;
    var filename = activity.source.data.filename;
    if (filename && (!blob || blob.size > 25000000)) {
      var getrequest = navigator.getDeviceStorage('pictures').get(filename);
      getrequest.onsuccess = function() {
        open(getrequest.result); // this blob should have a valid size and type
      };
      getrequest.onerror = function() {
        // if the file didn't exist, then try the blob
        open(blob);
      };
    }
    else {
      open(blob);
    }
  }

  // Display the specified blob, unless it is too big to display
  function open(blob) {
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
        frame.displayImage(blob, metadata.width, metadata.height);
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
                                               metadata.width, metadata.height,
                                               metadata.preview);
                          },
                          function error() {
                            // If we couldn't parse the preview image,
                            // just display full-size.
                            frame.displayImage(blob,
                                               metadata.width, metadata.height);
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

  function displayError(msgid) {
    alert(navigator.mozL10n.get(msgid));
    done();
  }

  function done() {
    activity.postResult({});
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
});

