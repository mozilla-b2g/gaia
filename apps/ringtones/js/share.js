/* global CustomDialog, Notification */
'use strict';

screen.mozLockOrientation('portrait');

// This page can be launched in one of two ways: as an activity opened by
// another app, or by clicking the "+" icon in the ringtone manager. First up,
// let's handle the activity case.
if (document.location.hash === '#activity') {
  navigator.mozSetMessageHandler('activity', function(activity) {
    // Turn an array of data into its first element; we need this to make
    // "share" activity data look more like "pick" activity data. We still want
    // to preserve the rest of the structure though, so that other attributes
    // get passed along.
    function flatten(arr) {
      return arr && arr.length ? arr[0] : null;
    }

    var data = activity.source.data;
    data.blob = flatten(data.blobs);
    data.metadata = flatten(data.metadata);
    data.name = flatten(data.filenames);

    handleShare(data, function(command, details) {
      switch (command) {
      case 'save':
        activity.postResult({});
        break;

      case 'cancel':
        activity.postError('pick cancelled');
        break;

      case 'error':
        activity.postError('pick error');
        break;
      }
    });
  });
}
else {
  // XXX: If this window was opened from the ringtones manager and we lose
  // visibility, we need to close the window so that subsequent calls to
  // window.open actually bring the window to the foreground! This is a
  // workaround for the fact that the ringtones app is currently has a "system"
  // role, which means that it doesn't participate in the window manager's
  // stack. See bug 1030954 for more details.
  window.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      window.close();
    }
  });

  window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) {
      console.error('Couldn\'t recieve message: origins don\'t match',
                    event.origin, window.location.origin);
      return;
    }

    handleShare(event.data, function(command, details) {
      event.source.postMessage(
        {command: command, details: details}, event.origin
      );
      window.close();
    });
  });
}

function handleShare(data, callback) {
  navigator.mozL10n.once(function() {
    var _ = navigator.mozL10n.get;

    function showError(title, message, okCallback) {
      var okButton = {
        title: 'ok',
        callback: function() {
          CustomDialog.hide();
          okCallback();
        }
      };
      CustomDialog.show(title, message, okButton);
    }

    var save = document.getElementById('save');
    var header = document.getElementById('header');
    var control = document.getElementById('playpause');
    var preview = document.getElementById('preview');

    var songtitle;
    if (data.metadata && data.metadata.title) {
      songtitle = data.metadata.title;
    }
    else if (data.name) {
      songtitle = data.name;
    }
    else {
      songtitle = _('ringtone-untitled');
    }

    var subtitle = '';
    if (data.metadata && data.metadata.artist) {
      subtitle = data.metadata.artist;
    }

    document.getElementById('songtitle').textContent = songtitle;
    document.getElementById('artist').textContent = subtitle;

    if (data.metadata && data.metadata.picture) {
      // If we have a picture, make sure the subtitle takes up some vertical
      // space so that everything lines up correctly.
      if (!subtitle) {
        document.getElementById('artist').textContent = '\u00a0'; // &nbsp;
      }

      try {
        var pictureURL = URL.createObjectURL(data.metadata.picture);
        var picture = document.getElementById('picture');
        picture.hidden = false;
        picture.style.backgroundImage = 'url(' + pictureURL + ')';
      }
      catch(e) {
        console.error('Couldn\'t set picture:', e);
      }
    }

    control.addEventListener('click', function() {
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
              var value = e.target.result[hack_settings_property];

              // Once we have the value, set the setting to something different.
              // This should pause the music app. Wait until we have
              // confirmation that the setting was set before starting to play
              // the preview so that the music app has time to pause first
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
    });

    preview.src = URL.createObjectURL(data.blob);

    preview.addEventListener('canplay', function() {
      save.disabled = false;
    });

    preview.addEventListener('error', function() {
      showError('play-error-title', 'play-error-desc',
                callback.bind(null, 'error'));
    });

    preview.addEventListener('playing', function() {
      control.classList.add('playing');
    });

    preview.addEventListener('pause', function() {
      control.classList.remove('playing');
    });

    header.addEventListener('action', function() {
      callback('cancel');
    });

    save.addEventListener('click', function() {
      // Disable the button so the user can't click it twice.
      save.disabled = true;

      // For a large blob this can take a while, so display a spinner.
      document.getElementById('saving-overlay').hidden = false;

      // Add to the custom ringtones DB and then set it in the settings.
      var info = {name: songtitle, subtitle: subtitle, blob: data.blob};
      window.customRingtones.add(info).then(function(tone) {
        if (document.getElementById('default-switch').checked) {
          return window.systemTones.set('ringtone', tone).then(function() {
            return {toneID: tone.id, setAsDefault: true};
          });
        }

        return {toneID: tone.id, setAsDefault: false};
      }).then(function(details) {
        // Show a notification indicating success, and then close it immediately
        // so it doesn't stink up the notifications tray! XXX: This UX isn't
        // great; we should turn this into a transient notification when we can.
        NotificationHelper.send(songtitle, {
          bodyL10n: details.setAsDefault ? 'set-default-tone' : 'created-tone'
        }).close();
        callback('save', details);
      }, function(error) {
        console.log('Error saving ringtone', error);
        showError('save-error-title', 'save-error-desc',
                  callback.bind(null, 'error'));
      });
    });
  });
}
