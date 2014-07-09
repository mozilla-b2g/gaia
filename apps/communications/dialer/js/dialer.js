'use strict';

var CallHandler = (function callHandler() {
  var COMMS_APP_ORIGIN = document.location.protocol + '//' +
    document.location.host;
  var FB_SYNC_ERROR_PARAM = 'isSyncError';

  /* === Settings === */
  var screenState = null;

  // Add the listener onload
  window.addEventListener('load', function getSettingsListener() {
    window.removeEventListener('load', getSettingsListener);

    setTimeout(function nextTick() {
      LazyLoader.load('/shared/js/settings_listener.js', function() {
        SettingsListener.observe('lockscreen.locked', null, function(value) {
          if (value) {
            screenState = 'locked';
          } else {
            screenState = 'unlocked';
          }
        });
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

    var number = activity.source.data.number;
    var fillNumber = function actHandleDisplay() {
      if (number) {
        KeypadManager.updatePhoneNumber(number, 'begin', false);
        if (window.location.hash != '#keyboard-view') {
          window.location.hash = '#keyboard-view';
        }
      } else {
        if (window.location.hash != '#contacts-view') {
          window.location.hash = '#contacts-view';
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
    });
  }

  function callEnded(data) {
    var highPriorityWakeLock = navigator.requestWakeLock('high-priority');
    var number = data.number;
    var direction = data.direction;
    var incoming = data.direction === 'incoming';

    NavbarManager.ensureResources(function() {
      // Missed call
      if (incoming && !data.duration) {
        sendNotification(number, data.serviceId);
      }

      Voicemail.check(number, function(isVoicemailNumber) {
        var entry = {
          date: Date.now() - parseInt(data.duration),
          type: incoming ? 'incoming' : 'dialing',
          number: number,
          serviceId: data.serviceId,
          emergency: data.emergency || false,
          voicemail: isVoicemailNumber,
          status: (incoming && data.duration > 0) ? 'connected' : null
        };

        CallLogDBManager.add(entry, function(logGroup) {
          highPriorityWakeLock.unlock();
          CallLog.appendGroup(logGroup);
        });
      });
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
    var command = message['command'];
    var isAtd = command.startsWith('ATD');

    // Not a dialing request
    if (command !== 'BLDN' && !isAtd) {
      return;
    }

    // Dialing a specific number
    if (isAtd && command[3] !== '>') {
      var phoneNumber = command.substring(3);
      CallHandler.call(phoneNumber);
      return;
    }

    // Dialing from the call log
    // ATD>3 means we have to call the 3rd recent number.
    var position = isAtd ? parseInt(command.substring(4), 10) : 1;
    CallLogDBManager.getGroupAtPosition(position, 'lastEntryDate', true, null,
    function(result) {
      if (result && (typeof result === 'object') && result.number) {
        CallHandler.call(result.number);
      } else {
        console.log('Could not get the group at: ' + position +
                    '. Error: ' + result);
      }
    });
  }

  /* === Calls === */
  function call(number) {
    if (MmiManager.isMMI(number)) {
      if (number === '*#06#') {
        MmiManager.showImei();
      } else {
        var connections = navigator.mozMobileConnections;
        var settings = navigator.mozSettings;
        if (connections.length === 1) {
          MmiManager.send(number, 0);
        }

        var req = settings.createLock().get('ril.telephony.defaultServiceId');

        req.onsuccess = function getDefaultServiceId() {
          var id = req.result['ril.telephony.defaultServiceId'] || 0;
          MmiManager.send(number, id);
        };

        req.onerror = function getDefaultServiceIdError() {
          MmiManager.send(number, 0);
        };
      }

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
      KeypadManager.updatePhoneNumber(number, 'begin', true);
    };

    var oncall = function() {
      SuggestionBar.hideOverlay();
      SuggestionBar.clear();
    };

    LazyLoader.load('/dialer/js/telephony_helper.js', function() {
      TelephonyHelper.call(number, oncall, connected, disconnected, error);
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

    if (document.hidden && evt.sessionEnded) {
      /* If the dialer is not visible and the session ends with this message
       * then this is most likely an unsollicited message. To prevent
       * interrupting the user we post a notification for it instead of
       * displaying the dialer UI. */
      MmiManager.sendNotification(evt.message, evt.serviceId, releaseWakeLock);
    } else {
      MmiManager.handleMMIReceived(evt.message, evt.sessionEnded,
                                   evt.serviceId);
    }
  }

  function init() {
    LazyLoader.load(['/shared/js/mobile_operator.js',
                     '/dialer/js/mmi.js',
                     '/dialer/js/mmi_ui.js',
                     '/shared/style/headers.css',
                     '/shared/style/input_areas.css',
                     '/shared/style_unstable/progress_activity.css',
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
    LazyLoader.load(['/shared/js/async_storage.js',
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
  },

  hide: function() {
    var views = document.getElementById('views');
    views.classList.add('hide-toolbar');
  },

  show: function() {
    var views = document.getElementById('views');
    views.classList.remove('hide-toolbar');
  }
};

var dialerStartup = function startup(evt) {
  window.removeEventListener('load', dialerStartup);

  KeypadManager.init();
  NavbarManager.init();

  setTimeout(function nextTick() {
    var lazyPanels = ['add-contact-action-menu',
                      'confirmation-message',
                      'edit-mode'];

    var lazyPanelsElements = lazyPanels.map(function toElement(id) {
      return document.getElementById(id);
    });
    LazyLoader.load(lazyPanelsElements);

    CallHandler.init();
    LazyL10n.get(function loadLazyFilesSet() {
      LazyLoader.load(['/shared/js/fb/fb_request.js',
                       '/shared/js/fb/fb_data_reader.js',
                       '/shared/js/fb/fb_reader_utils.js',
                       '/shared/style/confirm.css',
                       '/contacts/js/utilities/confirm.js',
                       '/dialer/js/newsletter_manager.js',
                       '/shared/style/edit_mode.css',
                       '/shared/style/headers.css']);
      lazyPanelsElements.forEach(navigator.mozL10n.translate);
    });
  });
};
window.addEventListener('load', dialerStartup);

// Listening to the keyboard being shown
// Waiting for issue 787444 being fixed
window.onresize = function(e) {
  if (window.innerHeight < 440) {
    document.body.classList.add('with-keyboard');
  } else {
    document.body.classList.remove('with-keyboard');
  }
};

// If the app loses focus, close the audio stream.
document.addEventListener('visibilitychange', function visibilitychanged() {
  if (!document.hidden) {
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
