'use strict';

var CallHandler = (function callHandler() {
  var telephony = navigator.mozTelephony;
  telephony.oncallschanged = function oncallschanged() {
    if (callScreenWindowLoaded) {
      if (telephony.calls.length === 0)
        // Calls might be ended before callscreen registers call-related
        // events. We send a message to notify callscreen of exiting when
        // there are no calls.
        sendCommandToCallScreen('*', 'exitCallScreen');
    }
  };

  var conn = navigator.mozMobileConnection;
  var _ = navigator.mozL10n.get;

  var callScreenWindow = null;
  var callScreenWindowLoaded = false;
  var currentActivity = null;

  /* === Settings === */
  var screenState = null;
  SettingsListener.observe('lockscreen.locked', null, function(value) {
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
      }
    };

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

  /* === Notifications support === */
  function handleNotification() {
    navigator.mozApps.getSelf().onsuccess = function gotSelf(evt) {
      var app = evt.target.result;
      app.launch('dialer');
      window.location.hash = '#recents-view';
    };
  }
  window.navigator.mozSetMessageHandler('notification', handleNotification);

  function handleNotificationRequest(number) {
    Contacts.findByNumber(number, function lookup(contact) {
      var title = _('missedCall');
      var sender = (number && number.length) ? number : _('unknown');

      if (contact && contact.name) {
        sender = contact.name;
      }

      var body = _('from', {sender: sender});

      navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
        var app = evt.target.result;

        var iconURL = NotificationHelper.getIconURI(app, 'dialer');

        var clickCB = function() {
          app.launch('dialer');
          window.location.hash = '#recents-view';
        };

        NotificationHelper.send(title, body, iconURL, clickCB);
      };
    });
  }

  /* === Recents support === */
  function handleRecentAddRequest(entry) {
    RecentsDBManager.init(function() {
      RecentsDBManager.add(entry, function() {
        RecentsDBManager.close();

        if (Recents) {
          Recents.refresh();
        }
      });
    });
  }

  /* === Incoming and STK calls === */
  function newCall() {
    openCallScreen();
  }
  window.navigator.mozSetMessageHandler('telephony-new-call', newCall);

  /* === Bluetooth Support === */
  function btCommandHandler(message) {
    var command = message['bluetooth-dialer-command'];

    if (command === 'BLDN') {
      RecentsDBManager.init(function() {
        RecentsDBManager.getLast(function(lastRecent) {
          if (lastRecent.number) {
            CallHandler.call(lastRecent.number);
          }
        });
      });
      return;
    }

    // Other commands needs to be handled from the call screen
    sendCommandToCallScreen('BT', command);
  }
  window.navigator.mozSetMessageHandler('bluetooth-dialer-command',
                                         btCommandHandler);

  /* === Headset Support === */
  function headsetCommandHandler(message) {
    sendCommandToCallScreen('HS', message);
  }
  window.navigator.mozSetMessageHandler('headset-button',
                                        headsetCommandHandler);

  /*
    Send commands to the callScreen via post message.
    @type: Handler to be used in the CallHandler. Currently managing to
           kind of commands:
           'BT': bluetooth
           'HS': headset
           '*' : for general cases, not specific to hardware control
    @command: The specific message to each kind of type
  */
  function sendCommandToCallScreen(type, command) {
    if (!callScreenWindow) {
      return;
    }

    var origin = document.location.protocol + '//' +
        document.location.host;
    var message = {
      type: type,
      command: command
    };

    callScreenWindow.postMessage(message, origin);
  }

  // Receiving messages from the callscreen via post message
  //   - when the call screen is closing
  //   - when we need to send a missed call notification
  function handleMessage(evt) {
    var data = evt.data;

    if (data === 'closing') {
      handleCallScreenClosing();
    } else if (data.type && data.type === 'notification') {
      // We're being asked to send a missed call notification
      handleNotificationRequest(data.number);
    } else if (data.type && data.type === 'recent') {
      handleRecentAddRequest(data.entry);
    }
  }
  window.addEventListener('message', handleMessage);

  /* === Calls === */
  function call(number) {
    if (UssdManager.isUSSD(number)) {
      UssdManager.send(number);
      return;
    }

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

         if (!callScreenWindow)
          openCallScreen();
      }
    }
  }

  function handleFlightMode() {
    ConfirmDialog.show(
      _('callAirplaneModeTitle'),
      _('callAirplaneModeMessage'),
      {
        title: _('cancel'),
        callback: function() {
          ConfirmDialog.hide();

          if (currentActivity) {
            currentActivity.postError('canceled');
            currentActivity = null;
          }
        }
      },
      {
        title: _('settings'),
        callback: function() {
          var activity = new MozActivity({
            name: 'configure',
              data: {
                target: 'device',
                section: 'root'
              }
            }
          );
          ConfirmDialog.hide();
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
      ConfirmDialog.show(
        _('emergencyDialogTitle'),
        _(emgcyDialogBody),
        {
          title: _('emergencyDialogBtnOk'),
          callback: function() {
            ConfirmDialog.hide();
          }
        }
      );
    }
  }

  /* === Attention Screen === */
  function openCallScreen() {
    if (callScreenWindow)
      return;

    var host = document.location.host;
    var protocol = document.location.protocol;
    var urlBase = protocol + '//' + host + '/dialer/oncall.html';

    var openWindow = function dialer_openCallScreen(state) {
      callScreenWindow = window.open(urlBase + '#' + state,
                  'call_screen', 'attention');
      callScreenWindow.onload = function onload() {
        callScreenWindowLoaded = true;
        if (telephony.calls.length === 0) {
          // Calls might be ended before callscreen is comletedly loaded,
          // so that callscreen will miss call-related events. We send a
          // message to notify callscreen of exiting when there are no calls.
          sendCommandToCallScreen('*', 'exitCallScreen');
        }
      };
    };

    // if screenState was initialized, use this value directly to openWindow()
    // else if mozSettings doesn't exist, use default value 'unlocked'
    if (screenState || !navigator.mozSettings) {
      screenState = screenState || 'unlocked';
      openWindow(screenState);
      return;
    }

    var req = navigator.mozSettings.createLock().get('lockscreen.locked');
    req.onsuccess = function dialer_onsuccess() {
      if (req.result['lockscreen.locked']) {
        screenState = 'locked';
      } else {
        screenState = 'unlocked';
      }
      openWindow(screenState);
    };
    req.onerror = function dialer_onerror() {
      // fallback to default value 'unlocked'
      screenState = 'unlocked';
      openWindow(screenState);
    };
  }

  function handleCallScreenClosing() {
    callScreenWindow = null;
    callScreenWindowLoaded = false;
  }

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

    // XXX : Move this to whole activity approach, so far
    // we don't have time to do a deep modification of
    // contacts activites. Postponed to v2
    var checkContactsTab = function() {
      var contactsIframe = document.getElementById('iframe-contacts');

      var index = contactsIframe.src.indexOf('#add-parameters');
      if (index != -1) {
        contactsIframe.src = contactsIframe.src.substr(0, index);
      }
    };

    var destination = window.location.hash;
    switch (destination) {
      case '#recents-view':
        checkContactsTab();
        Recents.updateContactDetails();
        recent.classList.add('toolbar-option-selected');
        Recents.updateLatestVisit();
        break;
      case '#contacts-view':
        contacts.classList.add('toolbar-option-selected');
        Recents.updateHighlighted();
        break;
      case '#keyboard-view':
        checkContactsTab();
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
    Recents.refresh();
  }
});

