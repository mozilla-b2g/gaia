'use strict';

/*
  Class which generates sounds while dialing
*/

var kFontStep = 4;
var kMinFontSize = 12;

// Frequencies comming from http://en.wikipedia.org/wiki/Telephone_keypad
var gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

var TonePlayer = {
  _sampleRate: 4000,

  init: function tp_init() {
   this._audio = new Audio();
   this._audio.mozSetup(2, this._sampleRate);
  },

  generateFrames: function tp_generateFrames(soundData, freqRow, freqCol) {
    var currentSoundSample = 0;
    var kr = 2 * Math.PI * freqRow / this._sampleRate;
    var kc = 2 * Math.PI * freqCol / this._sampleRate;
    for (var i = 0; i < soundData.length; i += 2) {
      var smoother = 0.5 + (Math.sin((i * Math.PI) / soundData.length)) / 2;

      soundData[i] = Math.sin(kr * currentSoundSample) * smoother;
      soundData[i + 1] = Math.sin(kc * currentSoundSample) * smoother;

      currentSoundSample++;
    }
  },

  play: function tp_play(frequencies) {
    var soundDataSize = this._sampleRate / 4;
    var soundData = new Float32Array(soundDataSize);
    this.generateFrames(soundData, frequencies[0], frequencies[1]);
    this._audio.mozWriteAudio(soundData);
  }
};

// TODO Review "Recents" and "Contacts" to implement "commslog" API

document.addEventListener('mozvisibilitychange', function visibility(e) {
  var url = document.location.href;
  var params = (function makeURL() {
    var a = document.createElement('a');
    a.href = url;

    var rv = {};
    var params = a.search.substring(1, a.search.length).split('&');
    for (var i = 0; i < params.length; i++) {
      var data = params[i].split('=');
      rv[data[0]] = data[1];
    }
    return rv;
  })();

  if (document.mozHidden) {
    Recents.stopUpdatingDates();
  } else {
    Recents.startUpdatingDates();

    var choice = params['choice'];
    var contacts = document.getElementById('contacts-label');
    if (choice == 'contact' || contacts.hasAttribute('data-active')) {
      Contacts.load();
      choiceChanged(contacts);
    }
  }
});

function choiceChanged(target) {
  var choice = target.dataset.choice;
  if (!choice)
    return;

  if (choice == 'contacts') {
    Contacts.load();
  }

  var view = document.getElementById(choice + '-view');
  if (!view)
    return;

  var tabs = document.getElementById('tabs').querySelector('fieldset');
  var tabsCount = tabs.childElementCount;
  for (var i = 0; i < tabsCount; i++) {
    var tab = tabs.children[i];
    delete tab.dataset.active;

    var tabView = document.getElementById(tab.dataset.choice + '-view');
    if (tabView)
      tabView.hidden = true;
  }

  target.dataset.active = true;
  view.hidden = false;
}



/*
  Manage how to launch our app and initialize everything needed
*/

window.addEventListener('localized', function startup(evt) {
  window.removeEventListener('localized', startup);

  KeypadManager.init();
  CallUI.init();
  CallHandler.setupTelephony();

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  var html = document.querySelector('html');
  var lang = document.mozL10n.language;
  html.lang = lang.code;
  html.dir = lang.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
