window.onload = function() {
  navigator.mozSetMessageHandler('activity', function handler(activityRequest) {
    var activityName = activityRequest.source.name;
    if (activityName !== 'share')
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

  function startShare(request) {
    cancelButton.addEventListener('click', cancelShare);

    gestureDetector.startDetecting();

    activity = request;
    blob = activity.source.data.blobs[0];
    url = URL.createObjectURL(blob);

    previewImage.onload = function() {
      var scalex = window.innerWidth / previewImage.width;
      var scaley = window.innerHeight / previewImage.height;

      scale = Math.max(scalex, scaley);

      // The width is unsigned long. When assigning to width, we need to round
      // off the value to prevent the round down problem of height.
      previewImage.width = Math.round(previewImage.width * scale);

      limitX = window.innerWidth - previewImage.width;
      limitY = window.innerHeight - previewImage.height;

      posX = Math.round(limitX / 2);
      posY = Math.round(limitY / 2);
      previewImage.style.transform =
        'translate(' + posX + 'px, ' + posY + 'px)';

      setButton.addEventListener('click', scaleImage);
      previewImage.addEventListener('pan', moveBackground);
    };

    previewImage.src = url;
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
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
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
