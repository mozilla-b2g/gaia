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
    //console.log('--------- eidth: ', document.documentElement.clientWidth);
    
    //scale image
    var temporaryImage = new Image();
    temporaryImage.onload = function resizeWallpaper() {
      var canvas = document.createElement('canvas');
      canvas.width = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(temporaryImage, 0, 0, temporaryImage.width, temporaryImage.height, 0, 0, document.documentElement.clientWidth, document.documentElement.clientHeight);
      canvas.toBlob(function toBlobSuccess(resized_blob) {
        console.log('--------jobs done!');
        preview.style.backgroundImage = 'url(' + URL.createObjectURL(resized_blob); + ')';
        setButton.addEventListener('click', setWallpaper);
        cancelButton.addEventListener('click', cancelShare);
      }, 'image/jpeg');
    }
    temporaryImage.src = window.URL.createObjectURL(blob);
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
