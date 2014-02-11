'use strict';

var toneType = location.hash.substr(1);
var pendingTone = null;

// Until Haida lands this is how users could go back to Settings app
document.getElementById('back').addEventListener('click', function() {
  var activity = new MozActivity({
    name: 'configure',
    data: {
      target: 'device'
    }
  });

  // Close the window when all remaining tasks are done.
  var remaining = 1;
  function done() {
    if (--remaining === 0) {
      window.close();
    }
  }

  // Close ourselves after the activity transition is completed.
  setTimeout(done, 1000);

  // If we have a tone that needs to be saved, save it too (and keep the window
  // around until saving is finished.
  if (pendingTone) {
    remaining = 2;
    setTone(toneType, pendingTone, done);
  }
});

getCurrentToneId(toneType, function(currentToneId) {
  var defaultTones = document.getElementById('default-tones');
  var customTones = document.getElementById('custom-tones');
  var template = new Template('sound-item-template');

  function domify(htmlText) {
    // Convert to DOM node.
    var dummyDiv = document.createElement('div');
    dummyDiv.innerHTML = htmlText;

    return dummyDiv.firstElementChild;
  }

  var player = document.createElement('audio'); // for previewing sounds
  function previewTone(tone) {
    // This will pause the tone if it's currently playing (good for really long
    // ones). However, it can be a bit confusing if the tone ends in a bunch of
    // silence, since it pauses it, but you'd expect it to replay the tone.
    var isPlaying = !player.paused && !player.ended;
    if (player.currentURL === tone.url && isPlaying) {
      player.pause();
    } else {
      player.src = player.currentURL = tone.url;
      if (tone.url)
        player.play();
    }
  }

  function selectTone(tone) {
    pendingTone = tone;
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
    input.addEventListener('click', previewTone.bind(input, tone));
    input.addEventListener('change', selectTone.bind(input, tone));

    list.querySelector('ul').appendChild(item);
    list.hidden = false;
  }

  if (toneType === 'alerttone')
    addToneToList(defaultTones, new NullRingtone());

  window.defaultRingtones.list(
    toneType, addToneToList.bind(null, defaultTones)
  );

  window.customRingtones.list(
    addToneToList.bind(null, customTones)
  );
});

window.addEventListener('localized', function() {
  // Localize the titles text based on the tone type
  var titles = ['title', 'default-title', 'custom-title'];
  titles.forEach(function(title) {
    navigator.mozL10n.localize(
      document.getElementById(title), toneType + '-' + title
    );
  });
});
