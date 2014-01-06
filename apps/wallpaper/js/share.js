window.onload = function() {
  navigator.mozSetMessageHandler('activity', function handler(activityRequest) {
    var activityName = activityRequest.source.name;
    if (activityName !== 'share')
      return;
    startShare(activityRequest);
  });


  var cancelButton = document.getElementById('cancel');
  var setButton = document.getElementById('set-wallpaper');
  var activity;
  var blob;
  var url;
  var cropEditor;

  var preview = document.getElementById('crop-frame');
  var gestureDetector = new GestureDetector(preview);
  function startShare(request) {
    cancelButton.addEventListener('click', cancelShare);
    gestureDetector.startDetecting();
    activity = request;
    blob = activity.source.data.blobs[0];
    url = URL.createObjectURL(blob);
    cropEditor = new imageCropEditor(url, preview, {}, function() {
     cropEditor.showCropOverlay();
     // use window size as limitation size.
     cropEditor.setCropAspectRatio(window.innerWidth, window.innerHeight);
     window.addEventListener('resize', resizeHandler);
    },null);
    setButton.addEventListener('click', scaleImage);
  }


  function scaleImage() {
  cropEditor.getCroppedRegionBlob('image/jpeg',
                                      window.innerWidth,
                                      window.innerHeight,
                                      setWallpaper);
  }

  function setWallpaper(blob) {
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
  function resizeHandler() {
    cropEditor.resize();
  }
  function endShare() {
    activity = null;
    window.removeEventListener('resize', resizeHandler);
    cropEditor.destroy();
    cropEditor = null;
    window.URL.revokeObjectURL(url);
    setButton.removeEventListener('click', scaleImage);
    cancelButton.removeEventListener('click', cancelShare);
  }
};