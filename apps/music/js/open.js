'use strict';

// strings for localization
var unknownAlbum;
var unknownArtist;
var unknownTitle;
// The L10n ids will be needed for player to update the unknown strings
// after localized event fires, but this won't happen because currently
// an inline activity will be closed if users change the system language
// we still keep this in case the system app change this behavior
var unknownAlbumL10nId = 'unknownAlbum';
var unknownArtistL10nId = 'unknownArtist';
var unknownTitleL10nId = 'unknownTitle';

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
  var data = request.source.data;
  var blob = request.source.data.blob;
  var backButton = document.getElementById('title-back');
  var saveButton = document.getElementById('title-save');
  var banner = document.getElementById('banner');
  var message = document.getElementById('message');
  var storage;       // A device storage object used by the save button
  var saved = false; // Did we save it?

  // If the app that initiated this activity wants us to allow the
  // user to save this blob as a file, and if device storage is available
  // and if there is enough free space, and if provided file extention
  // is appropriate for the file type, then display a save button.
  if (data.allowSave && data.filename && checkFilename()) {
    getStorageIfAvailable('music', blob.size, function(ds) {
      storage = ds;
      saveButton.hidden = false;
    });
  }

  playBlob(blob);

  function playBlob(blob) {
    PlayerView.init();
    PlayerView.setSourceType(TYPE_BLOB);
    PlayerView.dataSource = blob;
    PlayerView.play(); // Do we need to play for users?

    PlayerView.onerror = function invalid() {
      alert(navigator.mozL10n.get('audioinvalid'));
      done();
    };
  }

  // Set up events for close/save in the single player
  backButton.addEventListener('click', done);
  saveButton.addEventListener('click', save);

  function done() {
    PlayerView.stop();
    request.postResult({saved: saved});
  }

  function save() {
    // Hide the menu that holds the save button: we can only save once
    saveButton.hidden = true;
    // XXX work around bug 870619
    document.getElementById('title-text').textContent =
      document.getElementById('title-text').textContent;

    getUnusedFilename(storage, data.filename, function(filename) {
      var savereq = storage.addNamed(blob, filename);
      savereq.onsuccess = function() {
        // Remember that it has been saved so we can pass this back
        // to the invoking app
        saved = filename;
        // And tell the user
        showBanner(navigator.mozL10n.get('saved', {
          title: document.getElementById('title-text').textContent
        }));
      };
      savereq.onerror = function(e) {
        // XXX we don't report this to the user because it is hard to
        // localize.
        console.error('Error saving', filename, e);
      };
    });
  }

  function checkFilename() {
    var dotIdx = data.filename.lastIndexOf('.'), ext, type;

    if (dotIdx > -1) {
      ext = data.filename.substr(dotIdx + 1);

      // workaround for bug909373 and bug852864, since for audio/ogg files we
      // get video/ogg for blob.type, we let any file with ogg extention pass
      if (ext === 'ogg') {
        return true;
      } else {
        return MimeMapper.guessTypeFromExtension(ext) === blob.type;
      }
    } else {
      return false;
    }
  }

  function showBanner(msg) {
    message.textContent = msg;
    banner.hidden = false;
    setTimeout(function() {
      banner.hidden = true;
    }, 3000);
  }

  // Strip directories and just return the base filename
  function baseName(filename) {
    if (!filename)
      return '';
    return filename.substring(filename.lastIndexOf('/') + 1);
  }
}
