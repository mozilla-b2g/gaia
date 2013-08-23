const RINGTONE_BASE_URL = '/shared/resources/media/ringtones/';
const RINGTONE_LIST = RINGTONE_BASE_URL + 'list.json';
const RINGTONE_NAME_SETTING = 'dialer.ringtone.name';

navigator.mozSetMessageHandler('activity', function handler(activity) {
  var selectedRingtoneName, selectedRingtoneURL;

  // UI elements
  var done = document.getElementById('done');
  var cancel = document.getElementById('cancel');
  var player = document.createElement('audio'); // for previewing sounds

  cancel.onclick = function() {
    activity.postError('cancelled');
  };

  done.onclick = function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', selectedRingtoneURL);
    // XXX
    // This assumes that all system ringtones are ogg files
    // Maybe map based on the extension instead?
    xhr.overrideMimeType('audio/ogg');
    xhr.responseType = 'blob';
    xhr.send();
    xhr.onload = function() {
      activity.postResult({
        name: selectedRingtoneName,
        blob: xhr.response
      });
    };
  };

  // When we start up, we first need to get the list of all ringtones.
  // We also need the name of the currently selected ringtone.
  // Then we need to get localized names for the ringtones.
  // Then we can build our UI.
  getRingtoneFilenames(function(filenames) {
    getCurrentRingtoneName(function(currentRingtoneName) {
      getRingtoneNames(filenames, function(ringtones) {
        buildUI(ringtones, currentRingtoneName);
      });
    });
  });

  // Read the list.json file to get the names of all ringtones we know about
  // and pass an array of filenames to the callback function. These filenames
  // are relative to RINGTONE_BASE_URL.
  function getRingtoneFilenames(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', RINGTONE_LIST);
    xhr.responseType = 'json';
    xhr.send(null);

    xhr.onload = function() {
      // The list.json file organizes the ringtone urls as an object instead of
      // an array for some reason
      var filenames = [];
      for (var name in xhr.response) {
        filenames.push(name);
      }
      callback(filenames);
    };

    xhr.onerror = function() {
      console.error('Could not read ringtones list',
                    RINGTONES_LIST, xhr.status);
    };
  }

  function getCurrentRingtoneName(callback) {
    navigator.mozSettings
      .createLock()
      .get(RINGTONE_NAME_SETTING)
      .onsuccess = function(e) {
        callback(e.target.result[RINGTONE_NAME_SETTING]);
      };
  }


  // Wait until localization is done, then obtain localized names for each
  // each of the ringtone filenames, and invoke the callback with an object
  // that maps human-readble ringtone names to ringtone URLs
  function getRingtoneNames(filenames, callback) {
    navigator.mozL10n.ready(function() {
      var ringtones = {};
      filenames.forEach(function(filename) {
        var key = filename.replace('.', '_');
        var name = navigator.mozL10n.get(key);
        if (!name) {
          name = filename
            .replace('ringer_', '')   // strip prefix
            .replace(/\..+$/, '')     // strip suffix
            .replace('_', ' ');       // convert underscores to spaces
        }
        var url = RINGTONE_BASE_URL + filename;
        ringtones[name] = url;
      });

      callback(ringtones);
    });
  }

  function buildUI(ringtones, currentRingtoneName) {
    var list = document.getElementById('ringtones');
    for (var name in ringtones) {
      var url = ringtones[name];
      list.appendChild(buildListItem(name, url));
    }

    function buildListItem(name, url) {
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'ringtones';
      if (name === currentRingtoneName)
        input.checked = true;
      input.onchange = function(e) {
        if (input.checked) {
          selectedRingtoneName = name;
          selectedRingtoneURL = url;
          preview(url);
        }
      };

      var label = document.createElement('label');
      label.appendChild(input);
      label.appendChild(document.createTextNode(name));
      return label;
    }
  }

  function preview(url) {
    player.src = url;
    player.play();
  }
});
