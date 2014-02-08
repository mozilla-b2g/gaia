window.onload = function() {
  navigator.mozL10n.ready(function() {
    navigator.mozSetMessageHandler('activity', share);
  });
};

function share(activity) {
  var data = activity.source.data;
  var blob = data.blobs[0];

  var preview = document.getElementById('preview');
  var set = document.getElementById('set');
  var cancel = document.getElementById('cancel');
  var songtitle = document.getElementById('songtitle');
  var artist = document.getElementById('artist');
  var control = document.getElementById('playpause');

  preview.src = URL.createObjectURL(blob);
  if (data.metadata && data.metadata[0]) {
    songtitle.textContent = data.metadata[0].title || '';
    artist.textContent = data.metadata[0].artist || '';
  }

  preview.oncanplay = function() {
    set.disabled = false;
  };

  preview.onerror = function() {
    document.getElementById('message').textContent =
      navigator.mozL10n.get('cantplay');
  };

  cancel.onclick = function() {
    activity.postResult({});
  };

  set.onclick = function() {

    var name = '';
    if (data.metadata && data.metadata[0] && data.metadata[0].title)
      name = data.metadata[0].title;
    else if (data.filenames && data.filenames[0])
      name = data.filenames[0];

    var settings = {
      'dialer.ringtone': blob,
      'dialer.ringtone.name': name
    };

    navigator.mozSettings.createLock().set(settings).onsuccess = function() {
      activity.postResult({});
    };

    // Disable the button so the user can't click it twice
    set.disabled = true;

    // For a large blob this can take a while, so display a message
    document.getElementById('title').textContent =
      navigator.mozL10n.get('settingringtone');
  };

  control.onclick = function() {
    if (preview.paused) {
      // HACK HACK HACK
      //
      // This is an ugly workaround for bug 956811.
      //
      // Bugs in the system app window manager and Gecko's audio
      // channel manager prevent the music app from being paused when
      // this set ringtone app previews a ringtone. As a workaround,
      // the music app listens to the settings database and will pause
      // itself if we set a magic property that it specifies.  So if
      // the activity data includes a special magic property then we
      // know that we were invoked by the music app, and the music app
      // is playing a song.  The value of the property in the activity
      // data is the name of the property in the settings database
      // that it is listening to.
      //
      // See also the corresponding code in apps/music/js/Player.js
      //
      // This hack is implemented as a single self-invoking function so it is
      // easy to remove when we have a proper bug fix.
      //
      // HACK HACK HACK
      (function() {
        var hack_activity_property = '_hack_hack_shut_up';
        var hack_settings_property = data[hack_activity_property];
        if (hack_settings_property) {
          // Query the value of this setting
          var lock = navigator.mozSettings.createLock();
          lock.get(hack_settings_property).onsuccess = function(e) {
            value = e.target.result[hack_settings_property];

            // Once we have the value, set the setting to something different.
            // This should pause the music app. Wait until we have confirmation
            // that the setting was set before starting to play the preview
            // so that the music app has time to pause first
            var o = {};
            o[hack_settings_property] = !value;
            navigator.mozSettings.createLock().set(o).onsuccess = function() {
              preview.play();
            };

            // Alter the activity data so we only run this code once.
            delete data[hack_activity_property];
          };
        }
        else {
          preview.play();
        }
      }());
      // END OF HACK
      // When there is a real bug fix, just replace this entire if clause
      // with:
      //   preview.play();
    }
    else {
      preview.pause();
    }
  };

  preview.onplaying = function() {
    control.classList.add('playing');
  };

  preview.onpause = function() {
    control.classList.remove('playing');
  };
}
