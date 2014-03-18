navigator.mozSetMessageHandler('activity', function handler(activity) {
  var selectedSoundName, selectedSoundURL;
  var baseURL, listURL, settingKey;
  var toneType = activity.source.data.type;
  var allowNone = activity.source.data.allowNone;

  // Handle the case where toneType is an array. Note that we can't
  // display both types of tones at once. But a client might ask for
  // a ringtone or 'audio/mpeg' and we have to handle that.
  if (typeof toneType === 'object') {
    if (toneType.indexOf('ringtone') !== -1)
      toneType = 'ringtone';
    else if (toneType.indexOf('alerttone') !== -1)
      toneType = 'alerttone';
  }

  switch (toneType) {
  case 'ringtone':
    baseURL = '/shared/resources/media/ringtones/';
    listURL = '/shared/resources/media/ringtones/list.json';
    settingKey = 'dialer.ringtone.name';
    break;

  case 'alerttone':
    baseURL = '/shared/resources/media/notifications/';
    listURL = '/shared/resources/media/notifications/list.json';
    settingKey = 'notification.ringtone.name';
    break;

  default:
    activity.postError('pick type not supported');
    break;
  }

  // UI elements
  var title = document.getElementById('title');
  var done = document.getElementById('done');
  var cancel = document.getElementById('cancel');
  var player = document.createElement('audio'); // for previewing sounds

  // Start off with the Done button disabled, and only enable it once
  // a button has been checked
  done.disabled = true;

  // Localize the titlebar text based on the tone type
  navigator.mozL10n.localize(title, toneType + '-title');

  cancel.onclick = function() {
    activity.postError('cancelled');
  };

  done.onclick = function() {
    if (selectedSoundURL) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', selectedSoundURL);
      // XXX
      // This assumes that all system tones are ogg files
      // Maybe map based on the extension instead?
      xhr.overrideMimeType('audio/ogg');
      xhr.responseType = 'blob';
      xhr.send();
      xhr.onload = function() {
        activity.postResult({
          name: selectedSoundName,
          blob: xhr.response
        });
      };
    }
    else if (allowNone && selectedSoundURL === '') {  // Handle the 'None' case
      activity.postResult({
        name: selectedSoundName,
        blob: null
      });
    }
    else {
      // This should never happen. But if it does for some reason, then
      // behave as if the user clicked the cancel (Back) button.
      activity.postError('cancelled');
    }
  };

  // When we start up, we first need to get the list of all sounds.
  // We also need the name of the currently selected sound.
  // Then we need to get localized names for the sounds.
  // Then we can build our UI.
  getSoundFilenames(function(filenames) {
    getCurrentSoundName(function(currentSoundName) {
      getSoundNames(filenames, function(sounds) {
        buildUI(sounds, currentSoundName);
      });
    });
  });

  // Read the list.json file to get the names of all sounds we know about
  // and pass an array of filenames to the callback function. These filenames
  // are relative to baseURL.
  function getSoundFilenames(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', listURL);
    xhr.responseType = 'json';
    xhr.send(null);

    xhr.onload = function() {
      // The list.json file organizes the sound urls as an object instead of
      // an array for some reason
      var filenames = [];
      for (var name in xhr.response) {
        filenames.push(name);
      }
      callback(filenames);
    };

    xhr.onerror = function() {
      console.error('Could not read sounds list', listURL, xhr.status);
    };
  }

  function getCurrentSoundName(callback) {
    navigator.mozSettings.createLock().get(settingKey).onsuccess = function(e) {
      callback(e.target.result[settingKey]);
    };
  }

  // Wait until localization is done, then obtain localized names for each
  // each of the sound filenames, and invoke the callback with an object
  // that maps human-readable sound names to sound URLs
  function getSoundNames(filenames, callback) {
    navigator.mozL10n.ready(function() {
      var sounds = {};
      filenames.forEach(function(filename) {
        var key = filename.replace('.', '_');
        var name = navigator.mozL10n.get(key);
        if (!name) {
          var prefix = toneType === 'alerttone' ? 'notifier_' : 'ringer_';
          name = filename
            .replace(prefix, '')      // strip prefix
            .replace(/\..+$/, '')     // strip suffix
            .replace('_', ' ');       // convert underscores to spaces
        }
        var url = baseURL + filename;
        sounds[name] = url;
      });

      callback(sounds);
    });
  }

  function buildUI(sounds, currentSoundName) {
    var list = document.getElementById('sounds');

    // If 'None' is a valid option, put it at the top of the list
    // Note that we use an empty URL to represent the "None" option
    // and that this is different than an undefined or null URL.
    if (allowNone) {
      list.appendChild(buildListItem(navigator.mozL10n.get('none'), ''));
    }

    for (var name in sounds) {
      var url = sounds[name];
      list.appendChild(buildListItem(name, url));
    }

    function buildListItem(name, url) {
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'sounds';

      if (name === currentSoundName) {
        // Start off with the current sound selected.
        selectedSoundName = name;
        selectedSoundURL = url;
        input.checked = true;
        done.disabled = false; // Done is only disabled if no button is checked
      }
      input.onchange = function(e) {
        if (input.checked) {
          selectedSoundName = name;
          selectedSoundURL = url;
          done.disabled = false; // If something is checked, enable Done
          preview(url);
        }
      };

      var span = document.createElement('span');

      var label = document.createElement('label');
      label.classList.add('pack-radio');
      label.appendChild(input);
      label.appendChild(span);

      var sound = document.createElement('anchor');
      sound.classList.add('sound-name');
      sound.textContent = name;

      var listItem = document.createElement('li');
      listItem.appendChild(label);
      listItem.appendChild(sound);

      return listItem;
    }
  }

  function preview(url) {
    if (url) {  // If there is a URL, play it.
      player.mozAudioChannelType = 'ringer';
      player.src = url;
      player.play();
    }
    else {      // Otherwise, the user clicked None, so stop playing anything
      player.removeAttribute('src');
      player.load();
    }
  }
});
