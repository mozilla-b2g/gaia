'use strict';

document.addEventListener('mozvisibilitychange', function visibility(e) {
  if (!document.mozHidden) {
    RecentsDBManager.get(function(recents) {
      Recents.render(recents);
    });
  }
});

var CallHandler = {
  call: function ch_call(number) {
    var settings = window.navigator.mozSettings, req;

    if (settings) {
      // Once
      // https://bugzilla.mozilla.org/show_bug.cgi?id=788561
      // lands, we should get rid of `getLock()` call below.
      var settingsLock;
      if (settings.createLock) {
        settingsLock = settings.createLock();
      } else {
        settingsLock = settings.getLock();
      }
      req = settingsLock.get('ril.radio.disabled');
      req.addEventListener('success', function onsuccess() {
        var status = req.result['ril.radio.disabled'];

        if (!status) {
          this.startDial(number);
        } else {
          CustomDialog.show(
            _('callFlightModeTitle'),
            _('callFlightModeBody'),
            {
              title: _('callFlightModeBtnOk'),
              callback: function() {
                CustomDialog.hide();

                if (CallHandler.activityCurrent) {
                  CallHandler.activityCurrent.postError('canceled');
                  CallHandler.activityCurrent = null;
                }
              }
            }
          );
        }
      }.bind(this));
    } else {
      this.startDial(number);
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
  },

  startDial: function ch_startDial(number) {
    if (this._isUSSD(number)) {
      UssdManager.send(number);
    } else {
      var sanitizedNumber = number.replace(/-/g, '');
      var telephony = window.navigator.mozTelephony;
      if (telephony) {
        var call;
        if (navigator.mozMobileConnection &&
            navigator.mozMobileConnection.voice &&
            navigator.mozMobileConnection.voice.emergencyCallsOnly) {
          call = telephony.dialEmergency(sanitizedNumber);
        } else {
          call = telephony.dial(sanitizedNumber);
        }

        if (call) {
          var cb = function clearPhoneView() {
            KeypadManager.updatePhoneNumber('');
          };
          call.onconnected = cb;
          call.ondisconnected = cb;

          call.onerror = this.callError;
        }
      }
    }
  },

  callError: function callError(event) {
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
  // Workaround here until the bug 787415 is fixed
  // Gecko is sending an activity event in every multiple entry point
  // instead only the one that the href match.
  if (activity.source.name != 'dial')
    return;

  CallHandler.activityCurrent = activity;

  var number = activity.source.data.number;
  var fillNumber = function actHandleDisplay() {
    if (number) {
      KeypadManager.updatePhoneNumber(number);
      if (window.location.hash != '#keyboard-view') {
        window.location.hash = '#keyboard-view';
      }
      CallHandler.call(number);
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

// Listening to the keyboard being shown
// Waiting for issue 787444 being fixed
window.onresize = function(e) {
  if (window.innerHeight < 460) {
    document.body.classList.add('with-keyboard');
  } else {
    document.body.classList.remove('with-keyboard');
  }
};

