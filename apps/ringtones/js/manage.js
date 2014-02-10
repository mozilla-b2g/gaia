'use strict';

var toneType = location.hash.substr(1);

// Until Haida lands this is how users could go back to Settings app
document.getElementById('back').addEventListener('click', function() {
  var activity = new MozActivity({
    name: 'configure',
    data: {
      target: 'device'
    }
  });

  // Close ourself after the activity transition is completed.
  setTimeout(function() {
    window.close();
  }, 1000);
});

function domify(htmlText) {
  // Convert to DOM node.
  var dummyDiv = document.createElement('div');
  dummyDiv.innerHTML = htmlText;

  return dummyDiv.firstElementChild;
}

function getCurrentToneName(toneType, callback) {
  var settingKey;
  switch (toneType) {
  case 'ringtone':
    settingKey = 'dialer.ringtone.name';
    break;
  case 'alerttone':
    settingKey = 'notification.ringtone.name';
    break;
  default:
    throw new Error('pick type not supported');
  }

  navigator.mozSettings.createLock().get(settingKey).onsuccess = function(e) {
    callback(e.target.result[settingKey]);
  };
}

getCurrentToneName(toneType, function(currentToneName) {
  var defaultList = document.getElementById('default-list');
  var customList = document.getElementById('custom-list');
  var template = new Template('sound-item-template');

  window.defaultRingtones.list(toneType, function(tone) {
    var item = domify(template.interpolate({
      l10nId: tone.l10nId
    }));
    navigator.mozL10n.ready(function() {
      navigator.mozL10n.translate(item);
    });
    item.querySelector('input').checked = (name === currentToneName);

    defaultList.appendChild(item);
  });

  window.customRingtones.list(function(name) {
    var item = domify(template.interpolate({
      title: name
    }));
    customList.appendChild(item);
  });
});

window.addEventListener('localized', function() {
  var title = document.getElementById('title');

  // Localize the titlebar text based on the tone type
  navigator.mozL10n.localize(title, toneType + '-title');
});
