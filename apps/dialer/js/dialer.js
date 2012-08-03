'use strict';

document.addEventListener('mozvisibilitychange', function visibility(e) {
  if (!document.mozHidden) {
    Recents.render();
  }
});

var CallHandler = {
  call: function ch_call(number) {
    if (this._isUSSD(number)) {
      UssdManager.send(number);
    } else {
      var sanitizedNumber = number.replace(/-/g, '');
      var telephony = window.navigator.mozTelephony;
      if (telephony) {
        var call = telephony.dial(sanitizedNumber);

        if (call) {
          var cb = function clearPhoneView() {
            KeypadManager.updatePhoneNumber('');
          };
          call.onconnected = cb;
          call.ondisconnected = cb;
        }
      }
    }
  },

  _isUSSD: function ch_isUSSD(number) {
    var ussdChars = ['*', '#'];

    var relevantNumbers = [];
    relevantNumbers.push(number.slice(0, 1));
    relevantNumbers.push(number.slice(-1));

    return relevantNumbers.every(function ussdTest(number) {
      return ussdChars.indexOf(number) !== -1;
    });
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
        Recents.updateLatestVisit();
        break;
      case '#contacts-view':
        contacts.classList.add('toolbar-option-selected');
        Recents.updateHighlighted();
        break;
      case '#keyboard-view':
        keypad.classList.add('toolbar-option-selected');
        Recents.updateHighlighted();
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

window.navigator.mozSetMessageHandler('activity', function actHandle(activity) {
  var number = activity.source.data.number;
  var fillNumber = function actHandleDisplay() {
    if (number) {
      KeypadManager.updatePhoneNumber(number);
    }
  }

  if (document.readyState == 'complete') {
    fillNumber();
  } else {
    window.addEventListener('localized', function loadWait() {
      window.removeEventListener('localized', loadWait);
      fillNumber();
    });
  }

  activity.postResult({ status: 'accepted' });
});

