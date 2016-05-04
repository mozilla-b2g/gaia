'use strict';
/* global
  _,
  $,
  ForwardLock,
  objectStore,
  RINGTONE_NAME_KEY
*/

// Wait until we're loaded, localized, and get an activity request
window.addEventListener('load', function() {
  navigator.mozL10n.once(function() {
    navigator.mozSetMessageHandler('activity', function(activity) {
      var type = activity.source.data.type;
      if (type === 'ringtone' ||
          (Array.isArray(type) && type.indexOf('ringtone') !== -1)) {
        pickRingtone(activity);
      }
      else if (type === 'wallpaper' ||
               (Array.isArray(type) && type.indexOf('wallpaper') !== -1)) {
        pickWallpaper(activity);
      }
      else {
        console.error('unexpected activity request',
                      activity.source.name,
                      JSON.stringify(activity.source.data));
      }
    });
  });
});

function pickRingtone(activity) {
  var selectedRingtone;
  var selectedRingtoneID;
  var player = new Audio(); // for previewing sounds
  var currentRingtoneName;
  var numRingtones = 0;
  var container = $('ringtones');
  var header = $('header');
  container.hidden = false;

  // Display the right title
  $('done').hidden = false;
  $('title').textContent = _('pick-ringtone');

  // Make the cancel button work
  header.addEventListener('action', function() {
    player.pause(); // Stop any currently playing sound.
    activity.postError('cancelled');
  });

  // Make the done button work
  $('done').onclick = function() {
    player.pause(); // Stop any currently playing sound.

    // Lock the ringtone and return it as the activity result
    ForwardLock.getKey(function(secret) {
      ForwardLock.lockBlob(secret, selectedRingtone.blob, {},
                           function(lockedBlob) {
                             activity.postResult({
                               blob: lockedBlob,
                               name: selectedRingtone.descriptor.name,
                               id: selectedRingtoneID
                             });
                           });
    });
  };

  getCurrentRingtoneName(function(name) {
    currentRingtoneName = name;
    enumerateAndBuildUI();
  });

  function getCurrentRingtoneName(callback) {
    navigator.mozSettings
      .createLock()
      .get(RINGTONE_NAME_KEY)
      .onsuccess = function(e) {
        callback(e.target.result[RINGTONE_NAME_KEY]);
      };
  }

  function enumerateAndBuildUI() {
    // Enumerate the ringtones from the database and display them onscreen
    objectStore.readonly('ringtones', function(ringtoneStore) {
      var cursor = ringtoneStore.openCursor();
      cursor.onsuccess = function() {
        if (cursor.result) {
          addRingtone(cursor.result.value, 'forwardlock:' + cursor.result.key);
          cursor.result.continue();
        }
        else { // we reached the end of the enumeration
          if (numRingtones === 0) {
            displayError(activity, 'no-installed-ringtones');
          }
        }
      };
    });
  }

  function addRingtone(ringtone, id) {
    numRingtones++;
    var name = ringtone.descriptor.name;
    var listItem = document.createElement('li');

    var radio = document.createElement('gaia-radio');
    radio.name = 'ringtone';

    var label = document.createElement('label');
    label.textContent = name;
    radio.appendChild(label);

    if (name === currentRingtoneName) {
      selectedRingtone = ringtone;
      selectedRingtoneID = id;
      radio.checked = true;
    }

    radio.addEventListener('change', function() {
      if (radio.checked) {
        selectedRingtone = ringtone;
        selectedRingtoneID = id;
        play(ringtone);
      }
    });

    listItem.appendChild(radio);
    container.appendChild(listItem);
  }

  function play(ringtone) {
    // We create blob urls as needed. Since this app is always short-lived
    // we don't bother releasing them.
    if (!ringtone.url) {
      ringtone.url = URL.createObjectURL(ringtone.blob);
    }
    player.src = ringtone.url;
    player.play();
  }
}

function pickWallpaper(activity) {
  var numWallpapers = 0;
  var template = $('wallpaper-template');
  var container = $('wallpapers');
  container.hidden = false;

  $('title').textContent = _('pick-wallpaper');
  $('header').addEventListener('action', function() {
    activity.postError('cancelled');
  });

  // Enumerate the wallpapers from the database and display them onscreen
  objectStore.readonly('wallpapers', function(wallpaperStore) {
    var cursor = wallpaperStore.openCursor();
    cursor.onsuccess = function() {
      if (cursor.result) {
        addWallpaper(cursor.result.value);
        numWallpapers++;
        cursor.result.continue();
      }
      else { // we reached the end of the enumeration
        if (numWallpapers === 0) {
          displayError(activity, 'no-installed-wallpaper');
        }
      }
    };
  });

  function addWallpaper(wallpaper) {
    var blob = wallpaper.blob;
    var url = URL.createObjectURL(blob);
    var wallpaperEl = template.content.cloneNode(true).firstElementChild;
    container.appendChild(wallpaperEl);
    wallpaperEl.style.backgroundImage = 'url(' + url + ')';
    wallpaperEl.onclick = function() {
      ForwardLock.getKey(function(secret) {
        ForwardLock.lockBlob(secret, blob, {}, function(lockedBlob) {
          activity.postResult({ blob: lockedBlob });
        });
      });
    };
  }
}

function displayError(activity, id) {
  // using setTimeout here so we don't block with alert() while
  // a db transaction is still pending
  setTimeout(function() {
    alert(_(id));
    activity.postError(id);
  });
}
