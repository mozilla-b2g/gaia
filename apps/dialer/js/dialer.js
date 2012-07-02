'use strict';

document.addEventListener('mozvisibilitychange', function visibility(e) {
  var url = document.location.href;
  var data = e.data;
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

  if (!document.mozHidden) {
    Recents.render();
    Recents.startUpdatingDates();

    var choice = params['choice'];
    if (choice == 'contact') {
      Contacts.load();
    }
  } else {
    Recents.stopUpdatingDates();
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

var CallHandler = {
  _onCall: false,
  _screenLock: null,

  // callbacks
  call: function ch_call(number) {
    var sanitizedNumber = number.replace(/-/g, '');
    var telephony = window.navigator.mozTelephony;
    if (telephony) {
      telephony.dial(sanitizedNumber);
    }
  },

  // properties / methods
  get numberView() {
    delete this.numberView;
    return this.numberView = document.getElementById('call-number-view');
  }
};

var NavbarManager = {
  init: function nm_init() {
    this.update();
    var self = this;
    window.addEventListener('hashchange' , function nm_hashChange(event) {
      // TODO Implement it with building blocks:
      // https://github.com/jcarpenter/Gaia-UI-Building-Blocks/blob/master/inprogress/tabs.css
      // https://github.com/jcarpenter/Gaia-UI-Building-Blocks/blob/master/inprogress/tabs.html
      self.update();
    });
  },

  update: function nm_update() {
    var recent = document.getElementById('option-recents');
    var contacts = document.getElementById('option-contacts');
    var keypad = document.getElementById('option-keypad');

    recent.classList.remove('toolbar-option-selected');
    contacts.classList.remove('toolbar-option-selected');
    keypad.classList.remove('toolbar-option-selected');

    var destination = window.location.hash;
    switch (destination) {
      case '#recents-view':
        recent.classList.add('toolbar-option-selected');
        break;
      case '#contacts-view':
        contacts.classList.add('toolbar-option-selected');
        break;
      case '#keyboard-view':
        keypad.classList.add('toolbar-option-selected');
        break;
    }
  }
};

window.addEventListener('localized', function startup(evt) {
  window.removeEventListener('localized', startup);
  KeypadManager.init();
  NavbarManager.init();

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});

