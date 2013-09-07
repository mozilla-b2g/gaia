navigator.mozSetMessageHandler('activity', function handler(activity) {
  var selectedSoundName, selectedSoundURL;

  var pickType = activity.source.data.type;

  if (pickType.indexOf('ringtone') !== -1)
    pickType = 'ringtone';
  else if (pickType.indexOf('alerttone') !== -1)
    pickType = 'alerttone';
  else
    activity.postError('pick type not supported');

  var lists = {
    'ringtone': {
      baseURL: '/shared/resources/media/ringtones/',
      settingName: 'dialer.ringtone.name'
    },
    'alerttone': {
      baseURL: '/shared/resources/media/notifications/',
      settingName: 'notification.ringtone.name'
    }
  };

  var SOUND_BASE_URL = lists[pickType].baseURL;
  var SOUND_LIST = SOUND_BASE_URL + 'list.json';
  var SOUND_NAME_SETTING = lists[pickType].settingName;

  // UI elements
  var done = document.getElementById('done');
  var cancel = document.getElementById('cancel');
  var player = document.createElement('audio'); // for previewing sounds

  cancel.onclick = function() {
    activity.postError('cancelled');
  };

  done.onclick = function() {
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
  // are relative to SOUND_BASE_URL.
  function getSoundFilenames(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', SOUND_LIST);
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
      console.error('Could not read sounds list',
                    SOUND_LIST, xhr.status);
    };
  }

  function getCurrentSoundName(callback) {
    navigator.mozSettings
      .createLock()
      .get(SOUND_NAME_SETTING)
      .onsuccess = function(e) {
        callback(e.target.result[SOUND_NAME_SETTING]);
      };
  }


  // Wait until localization is done, then obtain localized names for each
  // each of the sound filenames, and invoke the callback with an object
  // that maps human-readble sound names to sound URLs
  function getSoundNames(filenames, callback) {
    navigator.mozL10n.ready(function() {
      var sounds = {};
      filenames.forEach(function(filename) {
        var key = filename.replace('.', '_');
        var name = navigator.mozL10n.get(key);
        if (!name) {
          name = filename
            .replace(pickType === 'alerttone' ? 'notifier_' :
            'ringer_', '')   // strip prefix
            .replace(/\..+$/, '')     // strip suffix
            .replace('_', ' ');       // convert underscores to spaces
        }
        var url = SOUND_BASE_URL + filename;
        sounds[name] = url;
      });

      callback(sounds);
    });
  }

  function buildUI(sounds, currentSoundName) {
    var list = document.getElementById('sounds');
    // Add 'None' option which should be at the top.
    if (pickType === 'alerttone') {
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
        //when user doesn't change the selected sound
        //populate below variables to handle done click
        selectedSoundName = name;
        selectedSoundURL = url;
        input.checked = true;
      }
      input.onchange = function(e) {
        if (input.checked) {
          selectedSoundName = name;
          selectedSoundURL = url;
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
    player.src = url;
    player.play();
  }
});
