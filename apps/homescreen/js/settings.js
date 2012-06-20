
'use strict';

window.addEventListener('DOMContentLoaded', function wallpaper() {
  var settings = navigator.mozSettings;
  if (!settings)
    return;

  var settingName = 'homescreen.wallpaper';
  function setWallpaper(value) {
    document.getElementById('icongrid').style.backgroundImage =
        'url(resources/images/backgrounds/' + (value || 'default.png') + ')';
  }

  // initial value
  var request = settings.getLock().get(settingName);
  request.onsuccess = function onsuccess() {
    setWallpaper(request.result[settingName]);
  };

  // setting observer
  settings.addObserver(settingName, function onchange(event) {
    setWallpaper(event.settingValue);
  });
});

