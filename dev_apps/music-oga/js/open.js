/* global AudioMetadata, getStorageIfAvailable, getUnusedFilename, MimeMapper,
          PlaybackQueue, PlayerView, TYPE_SINGLE */
'use strict';

navigator.mozL10n.once(function onLocalizationInit() {
  navigator.mozSetMessageHandler('activity', handleOpenActivity);
});

function handleOpenActivity(request) {
  var data = request.source.data;
  var blob = request.source.data.blob;
  var header = document.getElementById('header');
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
    saveButton.hidden = false;
    saveButton.disabled = true;
    header.runFontFit();

    getStorageIfAvailable('music', blob.size, function(ds) {
      storage = ds;
      saveButton.disabled = false;
    });
  }

  playBlob(blob);

  function playBlob(blob) {
    PlayerView.init(TYPE_SINGLE);
    PlayerView.stop();

    PlaybackQueue.loadSettings().then(() => {
      return AudioMetadata.parse(blob);
    }).then((metadata) => {
      var fileinfo = {metadata: metadata,
                      name: blob.name,
                      blob: blob};

      PlayerView.activate(new PlaybackQueue.StaticQueue([fileinfo]));
      PlayerView.start();
    }).catch((e) => {
      console.error(e);
      alert(navigator.mozL10n.get('audioinvalid'));
      done();
    });
  }

  // Set up events for close/save in the single player
  header.addEventListener('action', done);
  saveButton.addEventListener('click', save);

  // Terminate music playback when visibility is changed.
  window.addEventListener('visibilitychange',
    function onVisibilityChanged() {
      if (document.hidden) {
        done();
      }
    });

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
    var dotIdx = data.filename.lastIndexOf('.'), ext;

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
}
