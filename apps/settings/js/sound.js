/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function InitializeSoundsPanel() {
  'use strict';

  var lists = {
    'ringtones': {
      settingName: 'dialer.ringtone',
      element: document.getElementById('ringtones-list')
    },
    'notifications': {
      settingName: 'notification.ringtone',
      element: document.getElementById('notifications-list')
    }
  };

  // Root path containing the sounds
  var root = '/shared/resources/media/';

  function debug(str) {
    dump(' -*- SoundsPanel: ' + str + '\n');
  }

  function getSoundsFor(type, callback) {
    debug('retrieving sounds for ' + type);

    var url = root + type + '/list.json';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.send(null);

    xhr.onload = function successGetSoundsFor() {
      debug('success: get list for ' + type + '(' + url + ')');

      callback(xhr.response);
    };

    xhr.onerror = function errorGetSoundsFor() {
      debug('error: get list for ' + type + '(' + url + ')');

      // Something wrong happens, let's return an empty list.
      callback({});
    };
  }

  function getBase64For(type, name, callback) {
    debug('retrieving base64 data url for ' + name);

    var url = root + type + '/' + name;
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('text/plain; charset=x-user-defined');
    xhr.open('GET', url, true);
    xhr.send(null);

    xhr.onload = function successGetBase64For() {
      debug('success: get base64 for ' + type + '(' + name + ')');

      var binary = '';
      for (var i = 0; i < xhr.responseText.length; i++) {
        binary += String.fromCharCode(xhr.responseText.charCodeAt(i) & 0xff);
      }
      callback(window.btoa(binary));
    };

    xhr.onerror = function errorGetBase64For() {
      debug('error: get base64 for ' + type + '(' + name + ')');

      // Something wrong happens, likely because the file does not
      // exists. For now there is no feedback but I guess one should
      // be added one day.
      callback('');
    };
  }

  function generateList(sounds, type) {
    debug('generating list for ' + type + '\n');

    var list = '';

    // Add 'None' option which should be at the top.
    if (type == 'notifications') {
      list +=
        '<li>' +
        '  <label>' +
        '    <input type="radio" name="notifications-option" data-ignore' +
        ' value="none" data-label="none" />' +
        '    <span></span>' +
        '  </label>' +
        '  <a data-l10n-id="none">None</a>' +
        '</li>';
    }
    for (var sound in sounds) {
      var text = navigator.mozL10n.get(sound.replace('.', '_'));
      list +=
        '<li>' +
        '  <label>' +
        '    <input type="radio" name="' + type + '-option" data-ignore ' +
        'value="' + sound + '" data-label="' + text + '" />' +
        '    <span></span>' +
        '  </label>' +
        '  <a data-l10n-id="' + sound + '">' + text + '</a>' +
        '</li>';
    }
    return list;
  }

  function activateCurrentElementFor(list) {
    debug('activating current selected sound for ' + list.settingName);

    var key = list.settingName + '.name';
    var request = navigator.mozSettings.createLock().get(key);
    request.onsuccess = function successGetCurrentSound() {
      var settingValue = request.result[key];
      debug('success get current sound: ' + key + ' = ' + settingValue);

      var children = list.element.children;
      for (var i = 0; i < children.length; i++) {
        var input = children[i].querySelector('input');
        var elementValue = input.value;
        if (settingValue == elementValue) {
          input.checked = true;
          break;
        }
      }
    };

    request.onerror = function errorGetCurrentSound() {
      debug('error get current sound: ' + key);
    };
  }

  function generateSoundsLists() {
    for (var key in lists) {
      var list = lists[key];

      // There is a closure in order to keep the right target for list/key
      // when the callback ends.
      (function(list, key) {
        getSoundsFor(key, function(sounds) {
          list.element.innerHTML = generateList(sounds, key);
          activateCurrentElementFor(list);

          list.element.onclick = function onListClick(evt) {
            if (evt.target.tagName == 'LABEL') {
              if (evt.target.querySelector('input').value == 'none')
                stopAudioPreview();
              else
                audioPreview(evt.target, key);
            }
          };
        });
      })(list, key);
    }
  }

  function assignButtonsActions() {
    var dialog = document.getElementById('sound-selection');

    var submit = dialog.querySelector('[type=submit]');
    submit.onclick = function onsubmit() {
      stopAudioPreview();
      var rule = 'input[type="radio"]:checked';

      // Update the settings value for the selected sounds
      for (var key in lists) {
        var list = lists[key];
        var selected = list.element.querySelector(rule);
        if (!selected)
          continue;

        (function(key, settingName, value) {
          function setSound(data) {
            var setting = {};
            setting[settingName] = data ? 'data:audio/ogg;base64,' + data : '';
            navigator.mozSettings.createLock().set(setting);

            var setting2 = {};
            setting2[settingName + '.name'] = value;
            navigator.mozSettings.createLock().set(setting2);
          }
          if (value == 'none')
            setSound();
          else
            getBase64For(key, value, setSound);
        })(key, list.settingName, selected.value);
      }

      document.location.hash = 'sound';
    };

    var reset = dialog.querySelector('[type=reset]');
    reset.onclick = function onreset() {
      stopAudioPreview();
      document.location.hash = 'sound'; // hide dialog box
    };
  }

  function stopAudioPreview() {
    var audio = document.querySelector('#sound-selection audio');
    if (!audio.paused) {
      audio.pause();
      audio.src = '';
    }
  }

  // main
  generateSoundsLists();
  assignButtonsActions();

  var button = document.getElementById('call-tone-selection');
  button.onclick = function() {
    for (var key in lists) {
      activateCurrentElementFor(lists[key]);
    }
    document.location.hash = 'sound-selection';
  };
})();

