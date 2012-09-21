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

  function startShare(request) {
    activity = request;

    preview.style.backgroundImage =
      'url(' + activity.source.data.urls[0] + ')';

    setButton.addEventListener('click', setWallpaper);
    cancelButton.addEventListener('click', cancelShare);
  }

  function setWallpaper() {
    navigator.mozSettings.createLock().set({
      'wallpaper.image': activity.source.data.urls[0]
    });
    activity.postResult('shared');
    endShare();
  }

  function cancelShare() {
    activity.postError('cancelled');
    endShare();
  }

  function endShare() {
    activity = null;
    setButton.removeEventListener('click', setWallpaper);
    cancelButton.removeEventListener('click', cancelShare);
  }
};
