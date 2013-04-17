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
    activity = request;
    blob = activity.source.data.blobs[0];
    scaleImage(blob, function(resized_blob) {
      preview.style.backgroundImage = 'url(' +
        URL.createObjectURL(resized_blob); + ')';
      setButton.addEventListener('click', setWallpaper);
      cancelButton.addEventListener('click', cancelShare);
    });
  }

  function scaleImage(blobToResize, callback) {
    var temporaryImage = new Image();

    temporaryImage.onload = function resizeWallpaper() {
      var documentElement = document.documentElement;
      var sourceX = 0;
      var sourceY = 0;
      var destX = 0;
      var destY = 0;
      var stretchRatio;
      var sourceWidth;
      var sourceHeight;
      var canvas = document.createElement('canvas');
      canvas.width = documentElement.clientWidth;
      canvas.height = documentElement.clientHeight;
      var ctx = canvas.getContext('2d');

      // crop the image in the center
      if (canvas.width > canvas.height) {
        stretchRatio = (temporaryImage.width / canvas.width);
        sourceWidth = Math.floor(temporaryImage.width);
        sourceHeight = Math.floor(canvas.height * stretchRatio);
        sourceY = Math.floor((temporaryImage.height - sourceHeight) / 2);
      } else {
        stretchRatio = (temporaryImage.height / canvas.height);
        sourceWidth = Math.floor(canvas.width * stretchRatio);
        sourceHeight = Math.floor(temporaryImage.height);
        sourceX = Math.floor((temporaryImage.width - sourceWidth) / 2);
      }

      ctx.drawImage(
        temporaryImage,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        destX,
        destY,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(callback, 'image/jpeg');
    }
    temporaryImage.src = window.URL.createObjectURL(blobToResize);
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
    URL.revokeObjectURL(url);
    setButton.removeEventListener('click', setWallpaper);
    cancelButton.removeEventListener('click', cancelShare);
  }
};
