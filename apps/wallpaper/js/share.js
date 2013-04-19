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

  function startShare(request) {
    cancelButton.addEventListener('click', cancelShare);

    activity = request;
    blob = activity.source.data.blobs[0];
    scaleImage(blob, function(resizedBlob) {
      blob = resizedBlob;
      url = URL.createObjectURL(blob);
      preview.style.backgroundImage = 'url(' + url + ')';
      setButton.addEventListener('click', setWallpaper);
    });
  }

  var tmpImage;
  function scaleImage(blobToResize, callback) {
    tmpImage = new Image();

    tmpImage.onload = function resizeWallpaper() {
      // The image is corrupted
      if (tmpImage.naturalWidth == 0 || tmpImage.naturalHeight == 0) {
        setButton.disabled = true;
        return;
      }

      var documentElement = document.documentElement;
      var canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      var ctx = canvas.getContext('2d');

      var origWidth = tmpImage.width;
      var origHeight = tmpImage.height;
      var scalex = canvas.width / origWidth;
      var scaley = canvas.height / origHeight;

      // Take the larger of the two scales: we crop the image to the thumbnail
      var scale = Math.max(scalex, scaley);

      // Calculate the region of the image that will be copied to the
      // canvas to create the thumbnail
      var w = Math.round(canvas.width / scale);
      var h = Math.round(canvas.height / scale);
      var x = Math.round((origWidth - w) / 2);
      var y = Math.round((origHeight - h) / 2);

      ctx.drawImage(
        tmpImage,
        x, y, w, h,
        0, 0, canvas.width, canvas.height
      );

      canvas.toBlob(callback, 'image/jpeg');
    };
    tmpImage.src = window.URL.createObjectURL(blobToResize);
  }

  function setWallpaper() {
    // The settings database is text-only apparently, so we convert
    // the blob to a data URL.
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = function() {
      // Save the data url as the wallpaper setting
      var request = navigator.mozSettings.createLock().set({
        'wallpaper.image': reader.result
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
    };
  }

  function cancelShare() {
    activity.postError('cancelled');
    endShare();
  }

  function endShare() {
    activity = null;
    window.URL.revokeObjectURL(url);
    window.URL.revokeObjectURL(tmpImage.src);
    setButton.removeEventListener('click', setWallpaper);
    cancelButton.removeEventListener('click', cancelShare);
  }
};
