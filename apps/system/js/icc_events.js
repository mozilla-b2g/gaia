/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var icc_events = {
  downloadEvent: function icc_events_downloadEvent(message, eventObject) {
    DUMP('icc_events_downloadEvent: Downloading event:', eventObject);
    (icc.getIcc(message.iccId)).sendStkEventDownload(eventObject);
  },

  handleLocationStatus: function icc_events_handleLocationStatus(message, evt) {
    if (evt.type != 'voicechange') {
      return;
    }

    var conn = icc.getConnection(message.iccId);
    if (!conn) {
      DUMP(' STK handleLocationStatus - No connection found for this iccId' +
        message.iccId);
      return;
    }

    DUMP(' STK Location changed to MCC=' + conn.voice.network.mcc +
      ' MNC=' + conn.voice.network.mnc +
      ' LAC=' + conn.voice.cell.gsmLocationAreaCode +
      ' CellId=' + conn.voice.cell.gsmCellId +
      ' Status/Connected=' + conn.voice.connected +
      ' Status/Emergency=' + conn.voice.emergencyCallsOnly);
    var status = icc._iccManager.STK_SERVICE_STATE_UNAVAILABLE;
    if (conn.voice.connected) {
      status = icc._iccManager.STK_SERVICE_STATE_NORMAL;
    } else if (conn.voice.emergencyCallsOnly) {
      status = icc._iccManager.STK_SERVICE_STATE_LIMITED;
    }
    this.downloadEvent(message, {
      eventType: icc._iccManager.STK_EVENT_TYPE_LOCATION_STATUS,
      locationStatus: status,
      locationInfo: {
        mcc: conn.voice.network.mcc,
        mnc: conn.voice.network.mnc,
        gsmLocationAreaCode: conn.voice.cell.gsmLocationAreaCode,
        gsmCellId: conn.voice.cell.gsmCellId
      }
    });
  },

  handleCallsChanged: function icc_events_handleCallsChanged(message, evt) {
    if (evt.type != 'callschanged') {
      return;
    }
    DUMP(' STK Communication changed');
    var self = this;
    window.navigator.mozTelephony.calls.forEach(function callIterator(call) {
      DUMP(' STK:CALLS State change: ' + call.state);
      var outgoing = call.state == 'incoming';
      if (call.state == 'incoming') {
        self.downloadEvent(message, {
          eventType: icc._iccManager.STK_EVENT_TYPE_MT_CALL,
          number: call.number,
          isIssuedByRemote: outgoing,
          error: null
        });
      }
      call.addEventListener('error', function callError(err) {
        self.downloadEvent(message, {
          eventType: icc._iccManager.STK_EVENT_TYPE_CALL_DISCONNECTED,
          number: call.number,
          error: err
        });
      });
      call.addEventListener('statechange', function callStateChange() {
        DUMP(' STK:CALL State Change: ' + call.state);
        switch (call.state) {
          case 'connected':
            self.downloadEvent(message, {
              eventType: icc._iccManager.STK_EVENT_TYPE_CALL_CONNECTED,
              number: call.number,
              isIssuedByRemote: outgoing
            });
            break;
          case 'disconnected':
            call.removeEventListener('statechange', callStateChange);
            self.downloadEvent(message, {
              eventType: icc._iccManager.STK_EVENT_TYPE_CALL_DISCONNECTED,
              number: call.number,
              isIssuedByRemote: outgoing,
              error: null
            });
            break;
        }
      });
    });
  },

  handleLanguageSelectionEvent:
    function icc_events_handleLanguageSelectionEvent(message, evt) {
      DUMP(' STK Language selection = ' + evt.settingValue);
      this.downloadEvent(message, {
        eventType: icc._iccManager.STK_EVENT_TYPE_LANGUAGE_SELECTION,
        language: evt.settingValue.substring(0, 2)
      });
  },

  handleBrowserTerminationEvent:
    function icc_events_handleBrowserTerminationEvent(message, evt) {
      DUMP(' STK Browser termination');
      this.downloadEvent(message, {
        eventType: icc._iccManager.STK_EVENT_TYPE_BROWSER_TERMINATION
      });
  },

  handleUserActivityEvent:
    function icc_events_handleUserActivity(message, idleObserverObject) {
      DUMP(' STK User Activity');
      this.downloadEvent(message, {
        eventType: icc._iccManager.STK_EVENT_TYPE_USER_ACTIVITY
      });
      navigator.removeIdleObserver(idleObserverObject);
    },

  handleIdleScreenAvailableEvent:
    function icc_events_handleIdleScreenAvailableEvent(message) {
      DUMP(' STK IDLE screen available');
      this.downloadEvent(message, {
        eventType: icc._iccManager.STK_EVENT_TYPE_IDLE_SCREEN_AVAILABLE
      });
  },

  register: function icc_events_register(message, eventList) {
    DUMP('icc_events_register fpr card ' + message.iccId +
      ' - Events list:', eventList);
    for (var evt in eventList) {
      DUMP('icc_events_register - Registering event:', eventList[evt]);
      switch (eventList[evt]) {
      case icc._iccManager.STK_EVENT_TYPE_MT_CALL:
      case icc._iccManager.STK_EVENT_TYPE_CALL_CONNECTED:
      case icc._iccManager.STK_EVENT_TYPE_CALL_DISCONNECTED:
        DUMP('icc_events_register - Communications changes event');
        var comm = window.navigator.mozTelephony;
        comm.addEventListener('callschanged',
          function register_icc_event_callscahanged(evt) {
            icc_events.handleCallsChanged(message, evt);
          });
        break;
      case icc._iccManager.STK_EVENT_TYPE_LOCATION_STATUS:
        DUMP('icc_events_register - Location changes event');

        // XXX: check bug-926169
        // this is used to keep all tests passing while introducing
        // multi-sim APIs
        var conn = window.navigator.mozMobileConnection ||
          window.navigator.mozMobileConnections &&
            window.navigator.mozMobileConnections[0];

        conn.addEventListener('voicechange',
          function register_icc_event_voicechange(evt) {
            icc_events.handleLocationStatus(message, evt);
          });
        break;
      case icc._iccManager.STK_EVENT_TYPE_USER_ACTIVITY:
        DUMP('icc_events_register - User activity event');
        var stkUserActivity = {
          time: 5,
          onidle: function() {
            DUMP('STK Event - User activity - Going to idle');
          },
          onactive: function() {
            DUMP('STK Event - User activity - Going to active');
            icc_events.handleUserActivityEvent(message, stkUserActivity);
          }
        };
        navigator.addIdleObserver(stkUserActivity);
        break;
      case icc._iccManager.STK_EVENT_TYPE_IDLE_SCREEN_AVAILABLE:
        DUMP('icc_events_register - Idle screen available event');
        window.addEventListener('lock',
          function register_icc_event_idlescreen() {
            icc_events.handleIdleScreenAvailableEvent(message);
            window.removeEventListener('lock', register_icc_event_idlescreen);
          });
        break;
      case icc._iccManager.STK_EVENT_TYPE_CARD_READER_STATUS:
        DUMP('icc_events_register - TODO event: ', eventList[evt]);
        break;
      case icc._iccManager.STK_EVENT_TYPE_LANGUAGE_SELECTION:
        DUMP('icc_events_register - Language selection event');
        window.navigator.mozSettings.addObserver('language.current',
          function icc_events_languageChanged(e) {
            icc_events.handleLanguageSelectionEvent(message, e);
          });
        break;
      case icc._iccManager.STK_EVENT_TYPE_BROWSER_TERMINATION:
        DUMP('icc_events_register - Browser termination event');
        window.addEventListener('appterminated',
          function icc_events_browsertermination(e) {
            var app = Applications.getByManifestURL(e.detail.origin +
              '/manifest.webapp');
            if (!app) {
              return;
            }
            if (app.manifest.permissions.browser) {
              icc_events.handleBrowserTerminationEvent(message, e);
            }
          });
        break;
      case icc._iccManager.STK_EVENT_TYPE_DATA_AVAILABLE:
      case icc._iccManager.STK_EVENT_TYPE_CHANNEL_STATUS:
      case icc._iccManager.STK_EVENT_TYPE_SINGLE_ACCESS_TECHNOLOGY_CHANGED:
      case icc._iccManager.STK_EVENT_TYPE_DISPLAY_PARAMETER_CHANGED:
      case icc._iccManager.STK_EVENT_TYPE_LOCAL_CONNECTION:
      case icc._iccManager.STK_EVENT_TYPE_NETWORK_SEARCH_MODE_CHANGED:
      case icc._iccManager.STK_EVENT_TYPE_BROWSING_STATUS:
      case icc._iccManager.STK_EVENT_TYPE_FRAMES_INFORMATION_CHANGED:
        DUMP('icc_events_register - TODO event: ', eventList[evt]);
        break;
      }
    }
  }

};
