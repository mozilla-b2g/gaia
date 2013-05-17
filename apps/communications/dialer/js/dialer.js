'use strict';

var CallHandler = (function callHandler() {
  var COMMS_APP_ORIGIN = document.location.protocol + '//' +
    document.location.host;
  var callScreenWindow = null;
  var callScreenWindowLoaded = false;
  var callScreenWindowReady = false;
  var btCommandsToForward = [];
  var currentActivity = null;

  /* === Settings === */
  var screenState = null;

  // Add the listener onload
  window.addEventListener('load', function getSettingsListener() {
    window.removeEventListener('load', getSettingsListener);

    loader.load('/shared/js/settings_listener.js', function() {
      SettingsListener.observe('lockscreen.locked', null, function(value) {
        if (value) {
          screenState = 'locked';
        } else {
          screenState = 'unlocked';
        }
      });
    });
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

  /* === Notifications support === */
  function handleNotification(evt) {
    if (!evt.clicked) {
      return;
    }

    navigator.mozApps.getSelf().onsuccess = function gotSelf(evt) {
      var app = evt.target.result;
      app.launch('dialer');
      window.location.hash = '#recents-view';
    };
  }

  function handleNotificationRequest(number) {
    Contacts.findByNumber(number, function lookup(contact, matchingTel) {
      LazyL10n.get(function localized(_) {
        var title = _('missedCall');

        var body;
        if (!number) {
          body = _('from-withheld-number');
        } else if (contact) {
          var primaryInfo = Utils.getPhoneNumberPrimaryInfo(matchingTel,
            contact);
          if (primaryInfo) {
            if (primaryInfo !== matchingTel.value) {
              body = _('from-contact', {contact: primaryInfo});
            } else {
              body = _('from-number', {number: primaryInfo});
            }
          } else {
            body = _('from-withheld-number');
          }
        } else {
          body = _('from-number', {number: number});
        }

        navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
          var app = evt.target.result;

          var iconURL = NotificationHelper.getIconURI(app, 'dialer');

          var clickCB = function() {
            app.launch('dialer');
            window.location.hash = '#call-log-view';
          };

          NotificationHelper.send(title, body, iconURL, clickCB);
        };
      });
    });
  }

  /* === Recents support === */
  function handleRecentAddRequest(entry) {
    CallLogDBManager.add(entry, function(logGroup) {
      CallLog.appendGroup(logGroup, entry.contactInfo);
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
        window.location.hash = '#call-log-view';
        break;
    }
  }

  /* === ALL calls === */
  function newCall() {
    // We need to query mozTelephony a first time here
    // see bug 823958
    var telephony = navigator.mozTelephony;

    openCallScreen();
  }

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

    callScreenWindow.postMessage(message, COMMS_APP_ORIGIN);
  }

  // Receiving messages from the callscreen via post message
  //   - when the call screen is closing
  //   - when the call screen is ready to receive messages
  //   - when we need to send a missed call notification
  //   - when we need to add an entry to the recents database
  function handleMessage(evt) {
    if (evt.origin !== COMMS_APP_ORIGIN) {
      return;
    }

    var data = evt.data;

    if (data === 'closing') {
      handleCallScreenClosing();
    } else if (data === 'ready') {
      handleCallScreenReady();
    } else if (data.type && data.type === 'notification') {
      // We're being asked to send a missed call notification
      NavbarManager.ensureResources(function() {
        handleNotificationRequest(data.number);
      });
    } else if (data.type && data.type === 'recent') {
      NavbarManager.ensureResources(function() {
        handleRecentAddRequest(data.entry);
      });
    } else if (data.type && data.type === 'contactsiframe') {
      handleContactsIframeRequest(data.message);
    }
  }
  window.addEventListener('message', handleMessage);

  /* === Calls === */
  function call(number) {
    if (MmiManager.isMMI(number)) {
      MmiManager.send(number);
      // Clearing the code from the dialer screen gives the user immediate
      // feedback.
      KeypadManager.updatePhoneNumber('', 'begin', true);
      SuggestionBar.clear();
      return;
    }

    var connected, disconnected = function clearPhoneView() {
      KeypadManager.updatePhoneNumber('', 'begin', true);
    };

    var shouldCloseCallScreen = false;

    var error = function() {
      shouldCloseCallScreen = true;
    };

    var oncall = function() {
      if (!callScreenWindow) {
        SuggestionBar.hideOverlay();
        SuggestionBar.clear();
        openCallScreen(opened);
      }
    };

    var opened = function() {
      if (shouldCloseCallScreen) {
        sendCommandToCallScreen('*', 'exitCallScreen');
      }
    };

    loader.load('/dialer/js/telephony_helper.js', function() {
      TelephonyHelper.call(number, oncall, connected, disconnected, error);
    });
  }

  /* === Attention Screen === */
  // Each window gets a unique name to prevent a possible race condition
  // where we want to open a new call screen while the previous one is
  // animating out of the screen.
  var callScreenId = 0;
  function openCallScreen(openCallback) {
    if (callScreenWindow)
      return;

    var host = document.location.host;
    var protocol = document.location.protocol;
    var urlBase = protocol + '//' + host + '/dialer/oncall.html';

    var highPriorityWakeLock = navigator.requestWakeLock('high-priority');
    var openWindow = function dialer_openCallScreen(state) {
      callScreenWindow = window.open(urlBase + '#' + state,
                  ('call_screen' + callScreenId++), 'attention');

      callScreenWindow.onload = function onload() {
        highPriorityWakeLock.unlock();
        callScreenWindowLoaded = true;
        if (openCallback) {
          openCallback();
        }
      };

      var telephony = navigator.mozTelephony;
      telephony.oncallschanged = function dialer_oncallschanged(evt) {
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
  function init() {
    loader.load(['/shared/js/mobile_operator.js',
                 '/dialer/js/mmi.js',
                 '/dialer/js/mmi_ui.js',
                 '/shared/style/headers.css',
                 '/shared/style/input_areas.css',
                 '/shared/style_unstable/progress_activity.css',
                 '/dialer/style/mmi.css'], function() {

      if (window.navigator.mozSetMessageHandler) {
        window.navigator.mozSetMessageHandler('telephony-new-call', newCall);
        window.navigator.mozSetMessageHandler('activity', handleActivity);
        window.navigator.mozSetMessageHandler('notification',
                                              handleNotification);
        window.navigator.mozSetMessageHandler('bluetooth-dialer-command',
                                               btCommandHandler);
        window.navigator.mozSetMessageHandler('headset-button',
                                              headsetCommandHandler);

        window.navigator.mozSetMessageHandler('ussd-received', function(evt) {
          if (document.hidden) {
            var request = window.navigator.mozApps.getSelf();
            request.onsuccess = function() {
              request.result.launch('dialer');
            };
          }

          MmiManager.handleMMIReceived(evt.message, evt.sessionEnded);
        });
      }

    });
  }

  return {
    init: init,
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
  resourcesLoaded: false,
  /*
   * Ensures resources are loaded
   */
  ensureResources: function(cb) {
    if (this.resourcesLoaded) {
      if (cb && typeof cb === 'function') {
        cb();
      }
      return;
    }
    var self = this;
    loader.load(['/shared/js/async_storage.js',
                 '/shared/js/notification_helper.js',
                 '/shared/js/simple_phone_matcher.js',
                 '/dialer/js/contacts.js',
                 '/dialer/js/call_log.js',
                 '/dialer/style/call_log.css'], function rs_loaded() {
                    self.resourcesLoaded = true;
                    if (cb && typeof cb === 'function') {
                      cb();
                    }
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
      if (!contactsIframe)
        return;

      var index = contactsIframe.src.indexOf('#add-parameters');
      if (index != -1) {
        contactsIframe.src = contactsIframe.src.substr(0, index);
      }
    };

    var destination = window.location.hash;
    switch (destination) {
      case '#call-log-view':
        checkContactsTab();
        this.ensureResources(function() {
          recent.classList.add('toolbar-option-selected');
          CallLog.init();
        });
        break;
      case '#contacts-view':
        var frame = document.getElementById('iframe-contacts');
        if (!frame) {
          var view = document.getElementById('iframe-contacts-container');
          frame = document.createElement('iframe');
          frame.src = '/contacts/index.html';
          frame.id = 'iframe-contacts';
          frame.setAttribute('frameBorder', 'no');
          frame.classList.add('grid-wrapper');

          view.appendChild(frame);
        }

        contacts.classList.add('toolbar-option-selected');
        break;
      case '#keyboard-view':
        checkContactsTab();
        keypad.classList.add('toolbar-option-selected');
        break;
    }
  }
};

window.addEventListener('load', function startup(evt) {
  window.removeEventListener('load', startup);

  KeypadManager.init();
  NavbarManager.init();

  setTimeout(function nextTick() {
    var lazyPanels = ['add-contact-action-menu',
                      'confirmation-message',
                      'edit-mode'];

    loader.load(lazyPanels.map(function toElement(id) {
        return document.getElementById(id);
      })
    );

    CallHandler.init();
    LazyL10n.get(function loadLazyFilesSet() {
      loader.load(['/contacts/js/fb/fb_data.js',
                   '/contacts/js/fb/fb_contact_utils.js',
                   '/shared/style/confirm.css',
                   '/contacts/js/confirm_dialog.js',
                   '/dialer/js/newsletter_manager.js',
                   '/shared/style/edit_mode.css',
                   '/shared/style/headers.css']);
    });
  });
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

// If the app loses focus, close the audio stream. This works around an
// issue in Gecko where the Audio Data API causes gfx performance problems,
// in particular when scrolling the homescreen.
// See: https://bugzilla.mozilla.org/show_bug.cgi?id=779914
document.addEventListener('mozvisibilitychange', function visibilitychanged() {
  if (!document.mozHidden) {
    TonePlayer.ensureAudio();
  } else {
    // Reset the audio stream. This ensures that the stream is shutdown
    // *immediately*.
    TonePlayer.trashAudio();
    // Just in case stop any dtmf tone
    if (navigator.mozTelephony) {
      navigator.mozTelephony.stopTone();
    }
  }
});
