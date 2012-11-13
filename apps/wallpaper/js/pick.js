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
    // Ignore clicks that are not on one of the images
    if (!(e.target instanceof HTMLImageElement))
      return;

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = pickActivity.source.data.width;
    canvas.height = pickActivity.source.data.height;
    context.drawImage(e.target, 0, 0);

    canvas.toBlob(function(blob) {
      pickActivity.postResult({
        type: 'image/png',
        blob: blob
      }, 'image/png');

      endPick();
    }, pickActivity.source.data.type);
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
