'use strict';

var CallHandler = (function callHandler() {
  var telephony = navigator.mozTelephony;
  var _ = navigator.mozL10n.get;

  var callScreenDisplayed = false;
  var currentActivity = null;

  /* === Settings === */
  var screenState = 'locked';
  SettingsListener.observe('lockscreen.locked', false, function(value) {
    if (value) {
      screenState = 'locked';
    } else {
      screenState = 'unlocked';
    }
  });

  /* === WebActivity === */
  function handleActivity(activity) {
    // Workaround here until the bug 787415 is fixed
    // Gecko is sending an activity event in every multiple entry point
    // instead only the one that the href match.
    if (activity.source.name != 'dial')
      return;

    currentActivity = activity;

    var number = activity.source.data.number;
    var fillNumber = function actHandleDisplay() {
      if (number) {
        KeypadManager.updatePhoneNumber(number);
        if (window.location.hash != '#keyboard-view') {
          window.location.hash = '#keyboard-view';
        }
        call(number);
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
  }
  window.navigator.mozSetMessageHandler('activity', handleActivity);

  /* === Incoming calls === */
  function incoming() {
    if (callScreenDisplayed)
      return;

    openCallScreen();
  }
  window.navigator.mozSetMessageHandler('telephony-incoming', incoming);

  /* === Calls === */
  function call(number) {
    var settings = window.navigator.mozSettings, req;

    if (settings) {
      var settingsLock = settings.createLock();
      req = settingsLock.get('ril.radio.disabled');
      req.addEventListener('success', function onsuccess() {
        var status = req.result['ril.radio.disabled'];

        if (!status) {
          startDial(number);
        } else {
          handleFlightMode();
        }
      });
    } else {
      startDial(number);
    }
  }

  function startDial(number) {
    if (isUSSD(number)) {
      UssdManager.send(number);
    } else {
      var sanitizedNumber = number.replace(/-/g, '');
      if (telephony) {
        var call = telephony.dial(sanitizedNumber);

        if (call) {
          var cb = function clearPhoneView() {
            KeypadManager.updatePhoneNumber('');
          };
          call.onconnected = cb;
          call.ondisconnected = cb;
          call.onerror = handleError;

          if (!callScreenDisplayed)
            openCallScreen();
        }
      }
    }
  }

  function isUSSD(number) {
    var ussdChars = ['*', '#'];

    var relevantNumbers = [];
    relevantNumbers.push(number.slice(0, 1));
    relevantNumbers.push(number.slice(-1));

    return relevantNumbers.every(function ussdTest(number) {
      return ussdChars.indexOf(number) !== -1;
    });
  }

  function handleFlightMode() {
    CustomDialog.show(
      _('callFlightModeTitle'),
      _('callFlightModeBody'),
      {
        title: _('callFlightModeBtnOk'),
        callback: function() {
          CustomDialog.hide();

          if (currentActivity) {
            currentActivity.postError('canceled');
            currentActivity = null;
          }
        }
      }
    );
  }

  function handleError(event) {
    var erName = event.call.error.name, emgcyDialogBody,
        errorRecognized = false;

    if (erName === 'BadNumberError') {
      errorRecognized = true;
      emgcyDialogBody = 'emergencyDialogBodyBadNumber';
    } else if (erName === 'DeviceNotAcceptedError') {
      errorRecognized = true;
      emgcyDialogBody = 'emergencyDialogBodyDeviceNotAccepted';
    }

    if (errorRecognized) {
      CustomDialog.show(
        _('emergencyDialogTitle'),
        _(emgcyDialogBody),
        {
          title: _('emergencyDialogBtnOk'),
          callback: function() {
            CustomDialog.hide();
          }
        }
      );
    }
  }

  /* === Attention Screen === */
  function openCallScreen() {
    if (callScreenDisplayed)
      return;

    callScreenDisplayed = true;

    var host = document.location.host;
    var protocol = document.location.protocol;
    var urlBase = protocol + '//' + host + '/dialer/oncall.html';
    window.open(urlBase + '#' + screenState,
                'call_screen', 'attention');
  }

  // We use a simple postMessage protocol to know when the call screen is closed
  function handleMessage(evt) {
    if (evt.data == 'closing') {
      callScreenDisplayed = false;
    }
  }
  window.addEventListener('message', handleMessage);

  return {
    call: call
  };
})();

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
        Recents.updateContactDetails();
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

// Listening to the keyboard being shown
// Waiting for issue 787444 being fixed
window.onresize = function(e) {
  if (window.innerHeight < 460) {
    document.body.classList.add('with-keyboard');
  } else {
    document.body.classList.remove('with-keyboard');
  }
};

// Keeping the call history up to date
document.addEventListener('mozvisibilitychange', function visibility(e) {
  if (!document.mozHidden) {
    RecentsDBManager.init(function dbReady() {
      RecentsDBManager.get(function(recents) {
        Recents.render(recents);
      });
    });
  }
});
