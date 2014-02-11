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
  var defaultList = document.getElementById('default-list');
  var customList = document.getElementById('custom-list');
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
    if (player.currentURL === tone.url && !player.paused && !player.ended) {
      player.pause();
    } else {
      player.src = player.currentURL = tone.url;
      player.play();
    }
  }

  function selectTone(tone) {
    pendingTone = tone;
  }

  window.defaultRingtones.list(toneType, function(tone) {
    var item = domify(template.interpolate({
      l10nId: tone.l10nId
    }));
    navigator.mozL10n.ready(function() {
      navigator.mozL10n.translate(item);
    });

    var input = item.querySelector('input');
    input.checked = (tone.id === currentToneId);
    input.addEventListener('click', previewTone.bind(input, tone));
    input.addEventListener('change', selectTone.bind(input, tone));
    defaultList.appendChild(item);
  });

  window.customRingtones.list(function(tone) {
    document.getElementById('custom').hidden = false;

    var item = domify(template.interpolate({
      title: tone.name
    }));

    var input = item.querySelector('input');
    input.checked = (tone.id === currentToneId);
    input.addEventListener('click', previewTone.bind(input, tone));
    input.addEventListener('change', selectTone.bind(input, tone));
    customList.appendChild(item);
  });
});

window.addEventListener('localized', function() {
  // Localize the titles text based on the tone type
  navigator.mozL10n.localize(
    document.getElementById('title'), toneType + '-title'
  );
  navigator.mozL10n.localize(
    document.getElementById('custom-title'), toneType + '-custom-title'
  );
});
