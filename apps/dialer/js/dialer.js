'use strict';

document.addEventListener('mozvisibilitychange', function visibility(e) {
  if (!document.mozHidden) {
    Recents.render();
    Recents.startUpdatingDates();
  } else {
    Recents.stopUpdatingDates();
  }
});

var CallHandler = {
  call: function ch_call(number) {
    var sanitizedNumber = number.replace(/-/g, '');
    var telephony = window.navigator.mozTelephony;
    if (telephony) {
      telephony.dial(sanitizedNumber);
    }
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

