window.onload = function() {
  navigator.mozSetMessageHandler('activity', function handler(activityRequest) {
    var activityName = activityRequest.source.name;
    if (activityName !== 'share' && activityName !== 'setwallpaper')
      return;
    startShare(activityRequest);
  });

  var preview = document.getElementById('preview');
  var cancelButton = document.getElementById('cancel');
  var setButton = document.getElementById('set-wallpaper');
  var activity;
  var blob;
  var url;
  var gestureDetector = new GestureDetector(preview);
  // position of the image while dragging
  var posX = 0;
  var posY = 0;
  // maximum number of pixel we can drag the image
  var limitX;
  var limitY;
  var scale;
  var previewImage = document.getElementById('previewImage');

  // How big (in device pixels) is the screen?
  var screenWidth = Math.ceil(screen.width * window.devicePixelRatio);
  var screenHeight = Math.ceil(screen.height * window.devicePixelRatio);

  function startShare(request) {
    cancelButton.addEventListener('click', cancelShare);

    gestureDetector.startDetecting();

    activity = request;
    blob = activity.source.data.blobs[0];
    url = URL.createObjectURL(blob);

    // Find out the size and type of the image without decoding it.
    // If it is a really big jpeg, we'll need to downsample it while
    // decoding it so we don't run out of memory.
    ImageUtils.getSizeAndType(blob).then(gotImageData, imageDataError);

    function imageDataError(err) {
      console.error('Could not set wallpaper:', err);
      activity.postError('Could not set wallpaper: ' + err);
      endShare();
    }

    function gotImageData(imgdata) {
      if (imgdata.type === ImageUtils.JPEG) {
        var scale = Math.max(screenWidth / imgdata.width,
                             screenHeight / imgdata.height);
        var fragment = ImageUtils.Downsample.sizeNoMoreThan(scale);
        loadImage(url, fragment);
      }
      else {
        loadImage(url);
      }
    }

    function loadImage(url, fragment) {
      previewImage.src = url + (fragment ? fragment : '');

      previewImage.onload = function() {
        previewImage.hidden = false;

        // Compute a scale that will make the image at least as big as
        // the screen in both dimensions.
        var scalex = window.innerWidth / previewImage.width;
        var scaley = window.innerHeight / previewImage.height;
        scale = Math.max(scalex, scaley);

        // Apply that scale to the image. Note that scaling width will
        // also alter the height to match.
        previewImage.width = Math.round(previewImage.width * scale);

        // One dimension is now probably bigger than the screen, so figure
        // out how to center the image on the screen and compute how much
        // the user will be able to pan the image left and right or up
        // and down.
        limitX = window.innerWidth - previewImage.width;
        limitY = window.innerHeight - previewImage.height;

        posX = Math.round(limitX / 2);
        posY = Math.round(limitY / 2);
        previewImage.style.transform =
          'translate(' + posX + 'px, ' + posY + 'px)';

        setButton.addEventListener('click', scaleImage);
        previewImage.addEventListener('pan', moveBackground);
      };
    }
  }

  function moveBackground(evt) {
    var positions = evt.detail.relative;

    posX += positions.dx;
    if (posX > 0) {
      posX = 0;
    } else if (posX < limitX) {
      posX = limitX;
    }

    posY += positions.dy;
    if (posY > 0) {
      posY = 0;
    } else if (posY < limitY) {
      posY = limitY;
    }

    previewImage.style.transform = 'translate(' + posX + 'px, ' + posY + 'px)';
  }

  function scaleImage() {
      var canvas = document.createElement('canvas');
      // To have an image which matches the device pixel, we need to multiply
      // window.devicePixelRatio.
      canvas.width = screenWidth;
      canvas.height = screenHeight;
      var ctx = canvas.getContext('2d');

      var w = Math.round(window.innerWidth / scale);
      var h = Math.round(window.innerHeight / scale);
      var x = Math.round(-1 * posX / scale);
      var y = Math.round(-1 * posY / scale);

      if (x < 0) {
        x = 0;
        console.error('The value of x shouldn\'t be negative.');
      }
      if (y < 0) {
        y = 0;
        console.error('The value of y shouldn\'t be negative.');
      }

      ctx.drawImage(
        previewImage,
        x, y, w, h,
        0, 0, canvas.width, canvas.height
      );

      canvas.toBlob(function(newBlob) {
        blob = newBlob;
        setWallpaper();
      }, 'image/jpeg');
  }

  function setWallpaper() {
    // Save the blob as the wallpaper setting
    var request = navigator.mozSettings.createLock().set({
      'wallpaper.image': blob
    });

    request.onsuccess = function() {
      activity.postResult('shared');
      endShare();
    };

    request.onerror = function() {
      console.warn('error setting wallpaper.image:', request.error);
      activity.postError('could not set wallpaper: ' + request.error);
      endShare();
    };
  }

  function cancelShare() {
    activity.postError('cancelled');
    endShare();
  }

  function endShare() {
    activity = null;
    window.URL.revokeObjectURL(url);
    window.URL.revokeObjectURL(previewImage.src);
    setButton.removeEventListener('click', scaleImage);
    cancelButton.removeEventListener('click', cancelShare);
  }
};
