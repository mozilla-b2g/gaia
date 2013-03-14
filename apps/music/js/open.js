'use strict';

// strings for localization
var unknownAlbum;
var unknownArtist;
var unknownTitle;

// We get a localized event when the application is launched and when
// the user switches languages.
window.addEventListener('localized', function onlocalized() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // Get prepared for the localized strings, these will be used later
  unknownAlbum = navigator.mozL10n.get('unknownAlbum');
  unknownArtist = navigator.mozL10n.get('unknownArtist');
  unknownTitle = navigator.mozL10n.get('unknownTitle');

  navigator.mozSetMessageHandler('activity', handleOpenActivity);
});

function handleOpenActivity(request) {
  var fileName = request.source.data.filename;
  var backButton = document.getElementById('title-back');

  // XXX Please see https://bugzilla.mozilla.org/show_bug.cgi?id=811615
  // After the bluetooth app received an audio file
  // it will pass the file to music player via web activity
  // but we still got a blob which cannot be accepted by audio element
  // so we use the received filename to get the file again from deviceStorage
  var storage = navigator.getDeviceStorage('music');
  var getRequest = storage.get(fileName);

  getRequest.onsuccess = function() {
    var file = getRequest.result;

    playBlob(file);
  };
  getRequest.onerror = function() {
    var errmsg = getRequest.error && getRequest.error.name;
    console.error('Music.storage.get:', errmsg);
  };

  function playBlob(blob) {
    PlayerView.init();
    PlayerView.setSourceType(TYPE_BLOB);
    PlayerView.dataSource = blob;
    PlayerView.play(); // Do we need to play for users?
  }

  // Set up event for closing the single player
  backButton.addEventListener('click', done);

  function done() {
    PlayerView.stop();
    request.postResult({});
  }
}
