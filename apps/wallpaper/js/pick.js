window.onload = function() {
  navigator.mozSetMessageHandler('activity', function handler(activityRequest) {
    var activityName = activityRequest.source.name;
    if (activityName !== 'pick')
      return;
    startPick(activityRequest);
  });

  var cancelButton = document.getElementById('cancel');
  var wallpapers = document.getElementById('wallpapers');
  var pickActivity;

  function startPick(request) {
    pickActivity = request;
    wallpapers.addEventListener('click', pickWallpaper);
    cancelButton.addEventListener('click', cancelPick);
  }

  function pickWallpaper(e) {
    // Identify the wallpaper
    var backgroundImage = e.target.style.backgroundImage;
    var src = backgroundImage.match(/url\([\"']?([^\s\"']*)[\"']?\)/)[1];
    // Ignore clicks that are not on one of the images
    if (src == '')
      return;

    if (!pickActivity) { return; }

    var img = new Image();
    img.src = src;
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);

      canvas.toBlob(function(blob) {
        pickActivity.postResult({
          type: 'image/png',
          blob: blob
        }, 'image/png');

        endPick();
      }, pickActivity.source.data.type);
    };
  }

  function cancelPick() {
    pickActivity.postError('cancelled');
    endPick();
  }

  function endPick() {
    pickActivity = null;
    cancelButton.removeEventListener('click', cancelPick);
    wallpapers.removeEventListener('click', pickWallpaper);
  }
};
