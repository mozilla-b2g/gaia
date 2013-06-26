'use strict';

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
  var url;

  var cropEditor;

  function startShare(request) {
    cancelButton.addEventListener('click', cancelShare);

    activity = request;
    url = URL.createObjectURL(activity.source.data.blobs[0]);
    // use ImageEditor for cropping
    cropEditor = new ImageEditor(url, preview, {}, function() {

      cropEditor.showCropOverlay();
      // use window size as limitation size.
      cropEditor.setCropAspectRatio(window.innerWidth, window.innerHeight);

      setButton.addEventListener('click', scaleImage);
    });
  }

  function scaleImage() {
      cropEditor.getCroppedRegionBlob('image/jpeg',
                                      window.innerWidth,
                                      window.innerHeight,
                                      setWallpaper);
  }

  function setWallpaper(blob) {
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
    cropEditor.destroy();
    cropEditor = null;
    window.URL.revokeObjectURL(url);
    setButton.removeEventListener('click', setWallpaper);
    cancelButton.removeEventListener('click', cancelShare);
  }
};
