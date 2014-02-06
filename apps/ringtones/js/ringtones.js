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

var builtin = new BuiltInSounds(toneType);
builtin.getList(function(sounds, currentSoundName) {
  function domify(htmlText) {
    // Convert to DOM node.
    var dummyDiv = document.createElement('div');
    dummyDiv.innerHTML = htmlText;

    return dummyDiv.firstElementChild;
  }

  var list = document.getElementById('sounds');
  var template = new Template('sound-item-template');

  for (var name in sounds) {
    var url = sounds[name];
    var item = domify(template.interpolate({
      title: name
    }));
    item.querySelector('input').checked = (name === currentSoundName);
    list.appendChild(item);
  }
});

window.addEventListener('localized', function() {
  var title = document.getElementById('title');

  // Localize the titlebar text based on the tone type
  navigator.mozL10n.localize(title, toneType + '-title');
});
