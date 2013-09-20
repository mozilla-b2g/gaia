// Wait until we're loaded, localized, and get an activity request
window.addEventListener('load', function() {
  navigator.mozL10n.ready(function() {
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
  var player = new Audio(); // for previewing sounds
  var currentRingtoneName;
  var numRingtones = 0;
  var template = $('ringtone-template');
  var container = $('ringtones');
  container.hidden = false;

  // Display the right title
  $('title').textContent = _('pick-ringtone');

  // Make the cancel button work
  $('back').onclick = function() {
    player.pause(); // Stop any currently playing sound.
    activity.postError('cancelled');
  };

  // Make the done button work
  $('done').onclick = function() {
    player.pause(); // Stop any currently playing sound.

    // Lock the ringtone and return it as the activity result
    ForwardLock.getKey(function(secret) {
      ForwardLock.lockBlob(secret, selectedRingtone.blob, {},
                           function(lockedBlob) {
                             activity.postResult({
                               blob: lockedBlob,
                               name: selectedRingtone.descriptor.name
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
          addRingtone(cursor.result.value);
          cursor.result.continue();
        }
        else { // we reached the end of the enumeration
          if (numRingtones === 0)
            displayError(activity, 'no-installed-ringtones');
        }
      };
    });
  }

  function addRingtone(ringtone) {
    numRingtones++;
    var name = ringtone.descriptor.name;
    var dom = template.content.cloneNode(true);
    var input = dom.querySelector('input');
    dom.querySelector('a').textContent = name;

    if (name === currentRingtoneName) {
      selectedRingtone = ringtone;
      input.checked = true;
    }

    input.onchange = function() {
      if (input.checked) {
        selectedRingtone = ringtone;
        play(ringtone);
      }
    };

    container.appendChild(dom);
  }

  function play(ringtone) {
    // We create blob urls as needed. Since this app is always short-lived
    // we don't bother releasing them.
    if (!ringtone.url)
      ringtone.url = URL.createObjectURL(ringtone.blob);
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
  $('done').hidden = true;
  $('back').onclick = function() {
    activity.postError('cancelled');
  };

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
        if (numWallpapers === 0)
          displayError(activity, 'no-installed-wallpaper');
      }
    };
  });

  function addWallpaper(wallpaper) {
    var blob = wallpaper.blob;
    var url = URL.createObjectURL(blob);
    var wallpaper = template.content.cloneNode(true).firstElementChild;
    container.appendChild(wallpaper);
    wallpaper.style.backgroundImage = 'url(' + url + ')';
    wallpaper.onclick = function() {
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
