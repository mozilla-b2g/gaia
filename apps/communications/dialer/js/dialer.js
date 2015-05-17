'use strict';

/* global AccessibilityHelper, CallLog, CallLogDBManager, Contacts,
          KeypadManager, LazyLoader, MmiManager, Notification,
          NotificationHelper, SettingsListener, SimSettingsHelper,
          SuggestionBar, TelephonyHelper, Utils, Voicemail, MozActivity */

var NavbarManager = {
  init: function nm_init() {
    // binding now so that we can remove the listener in unit tests
    this.update = this.update.bind(this);
    this.update();
    window.addEventListener('hashchange', this.update);

    var contacts = document.getElementById('option-contacts');
    contacts.addEventListener('click', this.contactsTabTap);
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
    LazyLoader.load(['/shared/js/accessibility_helper.js',
                     '/shared/js/async_storage.js',
                     '/shared/js/notification_helper.js',
                     '/shared/js/simple_phone_matcher.js',
                     '/shared/js/contact_photo_helper.js',
                     '/shared/js/dialer/contacts.js',
                     '/shared/js/dialer/voicemail.js',
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
    var tabs = [recent, contacts, keypad];

    recent.classList.remove('toolbar-option-selected');
    contacts.classList.remove('toolbar-option-selected');
    keypad.classList.remove('toolbar-option-selected');

    // XXX : Move this to whole activity approach, so far
    // we don't have time to do a deep modification of
    // contacts activites. Postponed to v2
    var checkContactsTab = function() {
      var contactsIframe = document.getElementById('iframe-contacts');
      if (!contactsIframe) {
        return;
      }

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
          AccessibilityHelper.setAriaSelected(recent, tabs);
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
        this.ensureResources(function() {
          AccessibilityHelper.setAriaSelected(contacts, tabs);
        });
        break;
      case '#keyboard-view':
        checkContactsTab();
        keypad.classList.add('toolbar-option-selected');
        this.ensureResources(function() {
          AccessibilityHelper.setAriaSelected(keypad, tabs);
        });
        break;
    }
  },

  hide: function() {
    var views = document.getElementById('views');
    views.classList.add('hide-toolbar');
  },

  show: function() {
    var views = document.getElementById('views');
    views.classList.remove('hide-toolbar');
  },

  contactsTabTap: function() {
    // If we are not in the contacts-view, it's a first tap, do nothing
    if (window.location.hash != '#contacts-view') {
      return;
    }
    this._contactsHome();
  },

  _contactsHome: function() {
    var contactsIframe = document.getElementById('iframe-contacts');
    if (!contactsIframe) {
      return;
    }

    var forceHashChange = new Date().getTime();
    // Go back to contacts home
    contactsIframe.src = '/contacts/index.html#home?forceHashChange=' +
                         forceHashChange;
  }
};

var CallHandler = (function callHandler() {
  var COMMS_APP_ORIGIN = document.location.protocol + '//' +
    document.location.host;
  var FB_SYNC_ERROR_PARAM = 'isSyncError';

  /* === Settings === */
  var screenState = null;
  var engineeringModeKey = null;

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
      if (window.location.hash != '#keyboard-view') {
        window.location.hash = '#keyboard-view';
      }
    } else {
      if (window.location.hash != '#contacts-view') {
        window.location.hash = '#contacts-view';
      }
      NavbarManager._contactsHome();
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
        window.location.hash = '#contacts-view';
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
        window.location.hash = '#call-log-view';
      }
    };
  }

  /* === Telephony Call Ended Support === */
  function sendNotification(number, serviceId) {
    LazyLoader.load('/shared/js/dialer/utils.js', function() {
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
            window.location.hash = '#call-log-view';
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

    NavbarManager.ensureResources(function() {
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

  /* === postMessage support === */
  function handleMessage(evt) {
    if (evt.origin !== COMMS_APP_ORIGIN) {
      return;
    }

    var data = evt.data;

    if (!data.type) {
      return;
    }

    if (data.type === 'contactsiframe') {
      handleContactsIframeRequest(data.message);
    } else if (data.type === 'hide-navbar') {
      NavbarManager.hide();
    } else if (data.type === 'show-navbar') {
      NavbarManager.show();
    }
  }
  window.addEventListener('message', handleMessage);

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

  /* === Bluetooth Support === */
  function btCommandHandler(message) {
    var command = message.command;
    var isAtd = command.startsWith('ATD');

    // Not a dialing request
    if (command !== 'BLDN' && !isAtd) {
      return;
    }

    // Dialing a specific number
    if (isAtd && command[3] !== '>') {
      var phoneNumber = command.substring(3);
      LazyLoader.load(['/shared/js/sim_settings_helper.js'], function() {
        SimSettingsHelper.getCardIndexFrom('outgoingCall',
        function(defaultCardIndex) {
          if (defaultCardIndex === SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE) {
            LazyLoader.load(['/shared/js/component_utils.js',
                             '/shared/elements/gaia_sim_picker/script.js'],
            function() {
              var simPicker = document.getElementById('sim-picker');
              simPicker.getOrPick(defaultCardIndex, phoneNumber, function(ci) {
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
      return;
    }

    // Dialing from the call log
    // ATD>3 means we have to call the 3rd recent number.
    var position = isAtd ? parseInt(command.substring(4), 10) : 1;
    CallLogDBManager.getGroupAtPosition(
      position, 'lastEntryDate', true, 'dialing',
    function(result) {
      if (result && (typeof result === 'object') && result.number) {
        LazyLoader.load(['/shared/js/sim_settings_helper.js'], function() {
          SimSettingsHelper.getCardIndexFrom('outgoingCall', function(ci) {
            // If the default outgoing call SIM is set to "Always ask", or is
            // unset, we place this call on the SIM that was used the last time
            // we were in a phone call with this number/contact.
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

  /* === Calls === */
  function call(number, cardIndex) {
    if (engineeringModeKey && number === engineeringModeKey) {
      var activity = new MozActivity({
        name: 'internal-system-engineering-mode'
      });
      activity.onerror = function() {
        console.log('Could not launch engineering mode');
      };
      return;
    }

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

    var error = function() {
      KeypadManager.updatePhoneNumber(number, 'begin', false);
    };

    var oncall = function() {
      SuggestionBar.hideOverlay();
      SuggestionBar.clear();
    };

    LazyLoader.load(['/dialer/js/telephony_helper.js'], function() {
      TelephonyHelper.call(
        number, cardIndex, oncall, connected, disconnected, error);
    });
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
    } else {
      /* If the dialer is not visible and the session ends with this message
       * then this is most likely an unsollicited message. To prevent
       * interrupting the user we post a notification for it instead of
       * displaying the dialer UI. */
      MmiManager.sendNotification(evt.message, evt.serviceId)
                .then(releaseWakeLock);
    }
  }

  function init() {
    LazyLoader.load(['/shared/js/mobile_operator.js',
                     '/dialer/js/mmi.js',
                     '/dialer/js/mmi_ui.js',
                     '/shared/style/progress_activity.css',
                     '/dialer/style/mmi.css'], function() {

      if (window.navigator.mozSetMessageHandler) {
        window.navigator.mozSetMessageHandler('telephony-call-ended',
                                              callEnded);
        window.navigator.mozSetMessageHandler('activity', handleActivity);
        window.navigator.mozSetMessageHandler('notification',
                                              handleNotification);
        window.navigator.mozSetMessageHandler('bluetooth-dialer-command',
                                               btCommandHandler);

        window.navigator.mozSetMessageHandler('ussd-received', onUssdReceived);
      }
    });
    LazyLoader.load('/shared/js/settings_listener.js', function() {
      SettingsListener.observe('lockscreen.locked', null, function(value) {
        if (value) {
          screenState = 'locked';
        } else {
          screenState = 'unlocked';
        }
      });
      SettingsListener.observe('engineering-mode.key', null, function(value) {
        engineeringModeKey = value || null;
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
