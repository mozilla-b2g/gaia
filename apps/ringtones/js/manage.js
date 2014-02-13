'use strict';

if (location.hash === '#pick') {
  navigator.mozSetMessageHandler('activity', function handler(activity) {
    var tonePicker = new ActivityTonePicker(activity);
    listTones(tonePicker);
  });
} else {
  var toneType = location.hash.substr(1);
  var allowNone = toneType === 'alerttone';
  var tonePicker = new TonePicker(toneType, allowNone);
  listTones(tonePicker);
}

function listTones(tonePicker) {
  document.getElementById('back').addEventListener('click', function() {
    tonePicker.saveAndQuit();
  });

  getCurrentToneId(tonePicker.toneType, function(currentToneId) {
    var defaultTones = document.getElementById('default-tones');
    var customTones = document.getElementById('custom-tones');
    var template = new Template('sound-item-template');

    // Convert a string of HTML to a DOM node.
    function domify(htmlText) {
      var dummyDiv = document.createElement('div');
      dummyDiv.innerHTML = htmlText;

      return dummyDiv.firstElementChild;
    }

    function addToneToList(list, tone) {
      var item = domify(template.interpolate(tone));
      if (tone.l10nId) {
        navigator.mozL10n.ready(function() {
          navigator.mozL10n.translate(item);
        });
      }

      var input = item.querySelector('input');
      input.checked = (tone.id === currentToneId);
      input.addEventListener('click', function() {
        tonePicker.select(tone);
      });

      list.querySelector('ul').appendChild(item);
      list.hidden = false;
    }

    if (tonePicker.allowNone)
      addToneToList(defaultTones, new NullRingtone());

    window.defaultRingtones.list(
      toneType, addToneToList.bind(null, defaultTones)
    );

    window.customRingtones.list(
      addToneToList.bind(null, customTones)
    );
  });
}

window.addEventListener('localized', function() {
  // Localize the titles text based on the tone type
  var titles = ['title', 'default-title', 'custom-title'];
  titles.forEach(function(title) {
    navigator.mozL10n.localize(
      document.getElementById(title), toneType + '-' + title
    );
  });
});
