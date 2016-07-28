'use strict';

/* global BroadcastChannel, CallLog, CallLogDBManager, Contacts, KeypadManager,
          LazyLoader, MmiManager, Notification, NotificationHelper,
          SettingsListener, SimSettingsHelper, SuggestionBar, TelephonyHelper,
          Utils, Voicemail, Navigation */

var NavbarManager = {
  init: function nm_init() {
    Navigation.show('keypad');

    document.getElementById('views').addEventListener(
      'click',
      function(e) {
        var destination = e.target.dataset &&
                          e.target.dataset.destination;
        if (!destination) {
          return;
        }
        Navigation.show(destination);
      }
    );
  },

  hide: function() {
    var views = document.getElementById('views');
    views.classList.add('hide-toolbar');
  },

  show: function() {
    var views = document.getElementById('views');
    views.classList.remove('hide-toolbar');
  },
};

var CallHandler = (function callHandler() {
  var COMMS_APP_ORIGIN = document.location.protocol + '//' +
    document.location.host;
  var callScreenWindow = null;
  var callScreenWindowReady = false;
  var btCommandsToForward = [];
  var FB_SYNC_ERROR_PARAM = 'isSyncError';

  /* === Settings === */
  var screenState = null;

  /* === WebActivity === */
  function handleActivity(activity) {
    // Workaround here until the bug 787415 is fixed
    // Gecko is sending an activity event in every multiple entry point
    // instead only the one that the href match.
    if (activity.source.name != 'dial') {
      return;
    }

    var number = activity.source.data.number;
    if (number) {
      KeypadManager.updatePhoneNumber(number, 'begin', false);
      if (Navigation.currentView != 'keypad') {
        Navigation.showKeypad();
      }
    } else {
      if (Navigation.currentView != 'contacts') {
        Navigation.showContacts();
      }
    }
  }

  /* === Notifications support === */

  /**
   * Retrieves the parameters from an URL and forms an object with them.
   *
   * @param {String} input A string holding the parameters attached to an URL.
   * @return {Object} An object built using the parameters.
   */
  function deserializeParameters(input) {
    var rparams = /([^?=&]+)(?:=([^&]*))?/g;
    var parsed = {};

    input.replace(rparams, function($0, $1, $2) {
      parsed[$1] = decodeURIComponent($2);
    });

    return parsed;
  }

  function handleNotification(evt) {
    if (!evt.clicked) {
      return;
    }

    navigator.mozApps.getSelf().onsuccess = function gotSelf(selfEvt) {
      var app = selfEvt.target.result;
      app.launch('dialer');
      var location = document.createElement('a');
      location.href = evt.imageURL;
      if (location.search.indexOf(FB_SYNC_ERROR_PARAM) !== -1) {
        Navigation.showContacts();
      } else if (location.search.indexOf('ussdMessage') !== -1) {
        var params = deserializeParameters(evt.imageURL);

        Notification.get({ tag: evt.tag }).then(function(notifications) {
          for (var i = 0; i < notifications.length; i++) {
            notifications[i].close();
          }
        });

        MmiManager.handleMMIReceived(evt.body, /* sessionEnded */ true,
                                     params.cardIndex);
      } else {
        Navigation.showCalllog();
      }
    };
  }

  /* === Telephony Call Ended Support === */
  function sendNotification(number, serviceId) {
    LazyLoader.load('../shared/js/dialer/utils.js', function() {
      Contacts.findByNumber(number, function lookup(contact, matchingTel) {
        var title;
        if (navigator.mozIccManager.iccIds.length > 1) {
          title = { id: 'missedCallMultiSims', args: { n: serviceId + 1 } };
        } else {
          title = 'missedCall';
        }

        var body;
        if (!number) {
          body = 'from-withheld-number';
        } else if (contact) {
          var primaryInfo = Utils.getPhoneNumberPrimaryInfo(matchingTel,
            contact);
          if (primaryInfo) {
            if (primaryInfo !== matchingTel.value) {
              // primaryInfo is an object here
              body = {
                id: 'from-contact',
                args: { contact: primaryInfo.toString() }
              };
            } else {
              body = { id: 'from-number', args: { number: primaryInfo } };
            }
          } else {
            body = 'from-withheld-number';
          }
        } else {
          body = { id: 'from-number', args: { number: number } };
        }

        navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
          var app = evt.target.result;

          var iconURL = NotificationHelper.getIconURI(app, 'dialer');
          var clickCB = function() {
            app.launch('dialer');
            Navigation.showCalllog();
          };

          NotificationHelper.send(title, {
            bodyL10n: body,
            icon: iconURL
          }).then(function(notification) {
            notification.addEventListener('click', clickCB);
          });
        };
      });
    });
  }

  function callEnded(data) {
    var highPriorityWakeLock = navigator.requestWakeLock('high-priority');
    var number = data.number;
    var incoming = data.direction === 'incoming';

    // Missed call when not rejected by user
    if (incoming && !data.duration && !data.hangUpLocal) {
      sendNotification(number, data.serviceId);
    }

    Voicemail.check(number, data.serviceId).then(function(isVoicemailNumber) {
      var entry = {
        date: Date.now() - parseInt(data.duration),
        duration: data.duration,
        type: incoming ? 'incoming' : 'dialing',
        number: number,
        serviceId: data.serviceId,
        emergency: data.emergency || false,
        voicemail: isVoicemailNumber,
        status: (incoming && data.duration > 0) ? 'connected' : null
      };

      // Store and display the call that ended
      CallLogDBManager.add(entry, function(logEntry) {
        CallLog.appendGroup(logEntry);

        // A CDMA call can contain two calls. If it only has one call,
        // we have nothing left to do and release the lock.
        if (!data.secondNumber) {
          highPriorityWakeLock.unlock();
          return;
        }

        _addSecondCdmaCall(data, isVoicemailNumber, highPriorityWakeLock);
      });
    });
  }

  function _addSecondCdmaCall(data, isVoicemailNumber, wakeLock) {
    var entryCdmaSecond = {
      date: Date.now() - parseInt(data.duration),
      duration: data.duration,
      type: 'incoming',
      number: data.secondNumber,
      serviceId: data.serviceId,
      emergency: false,
      voicemail: isVoicemailNumber,
      status: 'connected'
    };

    CallLogDBManager.add(entryCdmaSecond, function(logGroupCdmaSecondCall) {
      CallLog.appendGroup(logGroupCdmaSecondCall);
      wakeLock.unlock();
    });
  }

  /* === Handle messages recevied from iframe === */
  function handleContactsIframeRequest(message) {
    switch (message) {
      case 'back':
        var contactsIframe = document.getElementById('iframe-contacts');
        // disable the function of receiving the messages posted from the iframe
        contactsIframe.contentWindow.history.pushState(null, null,
          '/contacts/index.html');
        Navigation.showCalllog();
        break;
    }
  }

  /* === ALL calls === */
  function newCall() {
    var telephony = navigator.mozTelephony;

    function dialer_oncallschanged() {
      if (telephony.calls.length !== 0) {
        openCallScreen();
        telephony.removeEventListener('callschanged', dialer_oncallschanged);
      }
    }

    telephony.addEventListener('callschanged', dialer_oncallschanged);
    // The handler is invoked explicitly to prevent races
    dialer_oncallschanged();
  }

  /* === Bluetooth Support === */
  function btCommandHandler(message) {
    var command = message.command;
    var partialCommand = command.substring(0, 3);
    if (command === 'BLDN') {
      // Bluetooth last dialed number command
      CallLogDBManager.getGroupAtPosition(1, 'lastEntryDate', true, 'dialing',
        function(result) {
          if (result && (typeof result === 'object') && result.number) {
            LazyLoader.load(['../shared/js/sim_settings_helper.js'],
            function() {
              SimSettingsHelper.getCardIndexFrom('outgoingCall', function(ci) {
                // If the default outgoing call SIM is set to "Always ask", or
                // is unset, we place this call on the SIM that was used the
                // last time we were in a phone call with this number/contact.
                if (ci === undefined || ci === null ||
                    ci == SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE) {
                  ci = result.serviceId;
                }

                CallHandler.call(result.number, ci);
              });
            });
          } else {
            console.log('Could not get the last outgoing group ' + result);
          }
        });
      return;
    } else if (partialCommand === 'ATD') {
      // Dialing a specific number
      if (command[3] !== '>') {
        var phoneNumber = command.substring(3);
        LazyLoader.load(['../shared/js/sim_settings_helper.js'], function() {
          SimSettingsHelper.getCardIndexFrom('outgoingCall',
          function(defaultCardIndex) {
            if (defaultCardIndex === SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE)
            {
              LazyLoader.load(['../shared/js/component_utils.js',
                               '../shared/elements/gaia_sim_picker/script.js'],
              function() {
                var simPicker = document.getElementById('sim-picker');
                simPicker.getOrPick(defaultCardIndex, phoneNumber,
                function(ci) {
                  CallHandler.call(phoneNumber, ci);
                });
                // Show the dialer so the user can select the SIM.
                navigator.mozApps.getSelf().onsuccess = function(selfEvt) {
                  var app = selfEvt.target.result;
                  app.launch('dialer');
                };
              });
            } else {
              CallHandler.call(phoneNumber, defaultCardIndex);
            }
          });
        });
      } else {
        // Dialing from the call log
        // ATD>3 means we have to call the 3rd recent number.
        var position = parseInt(command.substring(4), 10);
        CallLogDBManager.getGroupAtPosition(
          position, 'lastEntryDate', true, 'dialing',
        function(result) {
          if (result && (typeof result === 'object') && result.number) {
            LazyLoader.load(['../shared/js/sim_settings_helper.js'],
            function() {
              SimSettingsHelper.getCardIndexFrom('outgoingCall', function(ci) {
                // If the default outgoing call SIM is set to "Always ask", or
                // is unset, we place this call on the SIM that was used the
                // last time we were in a phone call with this number/contact.
                if (ci === undefined || ci === null ||
                    ci == SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE) {
                  ci = result.serviceId;
                }

                CallHandler.call(result.number, ci);
              });
            });
          } else {
            console.log('Could not get the group at: ' + position +
                        '. Error: ' + result);
          }
        });
      }

      return;
    }

    // Other commands needs to be handled from the call screen
    if (callScreenWindowReady) {
      sendCommandToCallScreen('BT', command);
    } else {
      // We queue the commands while the call screen is loading
      btCommandsToForward.push(command);
    }
  }

  /* === Headset Support === */
  function headsetCommandHandler(message) {
    sendCommandToCallScreen('HS', message);
  }

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

    var message = {
      type: type,
      command: command
    };
    callScreenWindow.postMessage(message, '*');
  }

  /* === postMessage support === */

  // Receiving messages from the callscreen via post message
  //   - when the call screen is closing
  //   - when the call screen is ready to receive messages
  //   - when we need to hide or show navbar
  function handleMessage(evt) {
    if (evt.origin !== COMMS_APP_ORIGIN) {
      return;
    }

    var data = evt.data;

    if (data === 'closing') {
      handleCallScreenClosing();
    } else if (data === 'ready') {
      handleCallScreenReady();
    } else if (!data.type) {
      return;
    } else if (data.type === 'contactsiframe') {
      handleContactsIframeRequest(data.message);
    } else if (data.type === 'hide-navbar') {
      NavbarManager.hide();
    } else if (data.type === 'show-navbar') {
      NavbarManager.show();
    }
  }

  window.addEventListener('message', handleMessage);

  /* === Calls === */
  function call(number, cardIndex) {
    if (MmiManager.isImei(number)) {
      MmiManager.showImei();

      // Clearing the code from the dialer screen gives the user immediate
      // feedback.
      KeypadManager.updatePhoneNumber('', 'begin', true);
      SuggestionBar.clear();
      return;
    }
    var connected, disconnected;
    connected = disconnected = function clearPhoneView() {
      KeypadManager.updatePhoneNumber('', 'begin', true);
    };
    var oncall = function() {
      if (callScreenWindow) {
        return;
      }

      openCallScreen();
      SuggestionBar.hideOverlay();
      SuggestionBar.clear();
    };
    LazyLoader.load(['js/telephony_helper.js'], function() {
      TelephonyHelper.call(
        number, cardIndex, oncall, connected, disconnected
      ).catch(function() {
        KeypadManager.updatePhoneNumber(number, 'begin', false);
        sendCommandToCallScreen('*', 'exitCallScreen');
      });
    });
  }

  /* === Attention Screen === */
  // Each window gets a unique name to prevent a possible race condition
  // where we want to open a new call screen while the previous one is
  // animating out of the screen.
  var callScreenId = 0;
  var openingWindow = false;
  function openCallScreen() {
    if (callScreenWindow || openingWindow) {
      return;
    }

    openingWindow = true;
    var urlBase = 'chrome://gaia/content/dialer/oncall.html';

    var highPriorityWakeLock = navigator.requestWakeLock('high-priority');
    var openWindow = function dialer_openCallScreen(state) {
      openingWindow = false;
      callScreenWindow = window.open(urlBase + '#' + state,
                  ('call_screen' + callScreenId++), 'attention');

      callScreenWindow.onload = function onload() {
        highPriorityWakeLock.unlock();
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
    callScreenWindowReady = false;
  }

  function handleCallScreenReady() {
    callScreenWindowReady = true;

    // Have any BT commands queued?
    btCommandsToForward.forEach(function btIterator(command) {
      sendCommandToCallScreen('BT', command);
    });
    btCommandsToForward = [];
  }

  /* === MMI === */
  function onUssdReceived(evt) {
    var lock = null;
    var safetyId;

    function releaseWakeLock() {
      if (lock) {
        lock.unlock();
        lock = null;
        clearTimeout(safetyId);
      }
    }

    if (document.hidden) {
      lock = navigator.requestWakeLock('high-priority');
      safetyId = setTimeout(releaseWakeLock, 30000);
      document.addEventListener('visibilitychange', releaseWakeLock);
    }

    if (!document.hidden || evt.session) {
      MmiManager.handleMMIReceived(evt.message, evt.session, evt.serviceId);
    } else if (evt.message) {
      /* If the dialer is not visible and the session ends with this message
       * then this is most likely an unsollicited message. To prevent
       * interrupting the user we post a notification for it instead of
       * displaying the dialer UI. */
      MmiManager.sendNotification(evt.message, evt.serviceId)
                .then(releaseWakeLock);
    } else {
      releaseWakeLock();
    }
  }

  function init() {
    var systemMessagesChannel = new BroadcastChannel('systemMessages');
    LazyLoader.load(['../shared/js/mobile_operator.js',
                     'js/mmi.js',
                     'js/mmi_ui.js',
                     '../shared/style/progress_activity.css',
                     'style/mmi.css'], function() {

        var systemMessageHandlers = {
          'telephony-new-call': newCall,
          'telephony-call-ended': callEnded,
          'activity': handleActivity,
          'notification': handleNotification,
          'bluetooth-dialer-command': btCommandHandler,
          'headset-button': headsetCommandHandler,
          'ussd-received': onUssdReceived
        };

        systemMessagesChannel.onmessage = (e) => {
          systemMessageHandlers[e.data.type](e.data.message);
        };
    });
    LazyLoader.load('../shared/js/settings_listener.js', function() {
      SettingsListener.observe('lockscreen.locked', null, function(value) {
        if (value) {
          screenState = 'locked';
        } else {
          screenState = 'unlocked';
        }
      });
    });
  }

  return {
    init: init,
    call: call
  };
})();

// Listening to the keyboard being shown
// Waiting for issue 787444 being fixed
window.onresize = function(e) {
  if (window.innerHeight < 440) {
    NavbarManager.hide();
  } else {
    NavbarManager.show();
  }
};
