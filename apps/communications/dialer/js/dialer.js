'use strict';

var CallHandler = (function callHandler() {
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
        KeypadManager.updatePhoneNumber(number, 'begin', false);
        if (window.location.hash != '#keyboard-view') {
          window.location.hash = '#keyboard-view';
        }
      }
    };

    if (document.readyState == 'complete') {
      fillNumber();
    } else {
      window.addEventListener('load', function loadWait() {
        window.removeEventListener('load', loadWait);
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
      LazyL10n.get(function localized(_) {
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
    });
  }

  /* === Recents support === */
  function handleRecentAddRequest(entry) {
    Recents.load(function recentsLoaded() {
      RecentsDBManager.init(function() {
        RecentsDBManager.add(entry, function() {
          RecentsDBManager.close();
          Recents.refresh();
        });
      });
    });
  }

  /* === Handle messages recevied from iframe === */
  function handleContactsIframeRequest(message) {
    switch (message) {
      case 'back':
        var contactsIframe = document.getElementById('iframe-contacts');
        // disable the function of receiving the messages posted from the iframe
        contactsIframe.contentWindow.history.pushState(null, null, '/contacts/index.html');
        window.location.hash = '#recents-view';
        break;
    }
  }

  /* === Incoming and STK calls === */
  function newCall() {
    // We need to query mozTelephony a first time here
    // see bug 823958
    var telephony = navigator.mozTelephony;

    openCallScreen();
  }
  window.navigator.mozSetMessageHandler('telephony-new-call', newCall);

  /* === Bluetooth Support === */
  function btCommandHandler(message) {
    var command = message['command'];
    var partialCommand = command.substring(0, 3);
    if (command === 'BLDN') {
      RecentsDBManager.init(function() {
        RecentsDBManager.getLast(function(lastRecent) {
          if (lastRecent.number) {
            CallHandler.call(lastRecent.number);
          }
        });
      });
      return;
    } else if (partialCommand === 'ATD') {
      var phoneNumber = command.substring(3);
      CallHandler.call(phoneNumber);
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
    } else if (data.type && data.type === 'contactsiframe') {
      handleContactsIframeRequest(data.message);
    }
  }
  window.addEventListener('message', handleMessage);

  /* === Calls === */
  function call(number) {
    if (UssdManager.isUSSD(number)) {
      UssdManager.send(number);
      return;
    }

    var oncall = function t_oncall() {
      if (!callScreenWindow) {
        openCallScreen(opened);
      }
    };

    var connected, disconnected = function clearPhoneView() {
      KeypadManager.updatePhoneNumber('', 'begin', true);
    };

    var shouldCloseCallScreen = false;

    var error = function() {
      shouldCloseCallScreen = true;
    };

    var opened = function() {
      if (shouldCloseCallScreen) {
        sendCommandToCallScreen('*', 'exitCallScreen');
      }
    };

    TelephonyHelper.call(number, oncall, connected, disconnected, error);
  }

  /* === Attention Screen === */
  function openCallScreen(openCallback) {
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
        if (openCallback) {
          openCallback();
        }
      };

      var telephony = navigator.mozTelephony;
      telephony.oncallschanged = function (evt) {
        if (callScreenWindowLoaded && telephony.calls.length === 0) {
          // Calls might be ended before callscreen is comletedly loaded,
          // so that callscreen will miss call-related events. We send a
          // message to notify callscreen of exiting when we got notified
          // there are no calls.
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

  /* === USSD === */
  window.navigator.mozSetMessageHandler('ussd-received',
                                        UssdManager.openUI.bind(UssdManager));

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
        Recents.load();
        Recents.updateLatestVisit();
        break;
      case '#contacts-view':
        var frame = document.getElementById('iframe-contacts');
        if (!frame.src) {
          frame.src = '/contacts/index.html';
        }

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

window.addEventListener('load', function startup(evt) {
  window.removeEventListener('load', startup);

  KeypadManager.init();
  NavbarManager.init();
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
