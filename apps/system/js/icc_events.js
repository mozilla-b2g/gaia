/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global DUMP, icc, applications */

'use strict';
/* exported icc_events */
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

  handleCallsChanged: function icc_events_handleCallsChanged(evt) {
    if (evt.type != 'callschanged') {
      return;
    }
    DUMP(' STK Communication changed : ' + evt.type);
    var self = this;
    window.navigator.mozTelephony.calls.forEach(function callIterator(call) {
      DUMP(' STK:CALLS State change: ' + call.state);
      var outgoing = call.state == 'incoming';
      var iccMan = icc._iccManager,
        serviceId = call.serviceId,
        iccId = window.navigator.mozMobileConnections[serviceId].iccId,
        iccEventSet = self.eventSet[iccId];
      if (call.state == 'incoming' && iccEventSet &&
        iccEventSet[iccMan.STK_EVENT_TYPE_MT_CALL]) {
        self.downloadEvent(iccEventSet[iccMan.STK_EVENT_TYPE_MT_CALL], {
          eventType: icc._iccManager.STK_EVENT_TYPE_MT_CALL,
          number: call.id.number,
          isIssuedByRemote: outgoing,
          error: null
        });
      }
      call.addEventListener('error', function callError(err) {
        if (iccEventSet &&
          iccEventSet[iccMan.STK_EVENT_TYPE_CALL_DISCONNECTED]) {
          self.downloadEvent(
            iccEventSet[iccMan.STK_EVENT_TYPE_CALL_DISCONNECTED], {
            eventType: icc._iccManager.STK_EVENT_TYPE_CALL_DISCONNECTED,
            number: call.id ? call.id.number : call.number,
            error: err
          });
        }
      });
      call.addEventListener('statechange', function callStateChange() {
        DUMP(' STK:CALL State Change: ' + call.state);
        switch (call.state) {
          case 'connected':
            if (iccEventSet &&
              iccEventSet[iccMan.STK_EVENT_TYPE_CALL_CONNECTED]) {
              self.downloadEvent(
                iccEventSet[iccMan.STK_EVENT_TYPE_CALL_CONNECTED], {
                eventType: icc._iccManager.STK_EVENT_TYPE_CALL_CONNECTED,
                number: call.id ? call.id.number : call.number,
                isIssuedByRemote: outgoing
              });
            }
            break;
          case 'disconnected':
            call.removeEventListener('statechange', callStateChange);
            if (iccEventSet &&
              iccEventSet[iccMan.STK_EVENT_TYPE_CALL_DISCONNECTED]) {
              self.downloadEvent(
                iccEventSet[iccMan.STK_EVENT_TYPE_CALL_DISCONNECTED], {
                eventType: icc._iccManager.STK_EVENT_TYPE_CALL_DISCONNECTED,
                number: call.id ? call.id.number : call.number,
                isIssuedByRemote: outgoing,
                error: null
              });
            }
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
        eventType: icc._iccManager.STK_EVENT_TYPE_BROWSER_TERMINATION,
        terminationCause: icc._iccManager.STK_BROWSER_TERMINATION_CAUSE_USER
      });
  },

  handleUserActivityEvent:
    function icc_events_handleUserActivity(message) {
      DUMP(' STK User Activity');
      this.downloadEvent(message, {
        eventType: icc._iccManager.STK_EVENT_TYPE_USER_ACTIVITY
      });
      if (this.stkUserActivity) {
        navigator.removeIdleObserver(this.stkUserActivity);
      }
    },

  handleIdleScreenAvailableEvent:
    function icc_events_handleIdleScreenAvailableEvent(message) {
      DUMP(' STK IDLE screen available');
      this.downloadEvent(message, {
        eventType: icc._iccManager.STK_EVENT_TYPE_IDLE_SCREEN_AVAILABLE
      });
      window.removeEventListener('homescreenopened',
        this.register_icc_event_idlescreen);
  },

  registerCallChanged: function(message, stkEvent) {
    DUMP('icc_events_registerCallChanged message: ' + message);
    DUMP('icc_events_registerCallChanged stkEvent: ' + stkEvent);
    var self = this;
    if (!self.eventSet) {
      DUMP('icc_events create eventList');
      var comm = window.navigator.mozTelephony;
      comm.addEventListener('callschanged', function(teleEvent) {
        self.handleCallsChanged(teleEvent);
      });
    }
    self.eventSet = {};

    if (!self.eventSet[message.iccId]) {
      DUMP('icc_events create eventList for ' + message.iccId);
      self.eventSet[message.iccId] = {};
    }

    if (!self.eventSet[message.iccId][stkEvent]) {
      DUMP('icc_events create eventList for ' +
        message.iccId + ' EVT: ' + stkEvent);
      self.eventSet[message.iccId][stkEvent] = message;
      DUMP('icc_events ' + self.eventSet[message.iccId]);
    }
  },

  register: function icc_events_register(message, eventList) {
    DUMP('icc_events_register fpr card ' + message.iccId +
      ' - Events list:', eventList);

    var conn = icc.getConnection(message.iccId);
    conn.removeEventListener('voicechange',
      this.register_icc_event_voicechange);

    if (this.stkUserActivity) {
      navigator.removeIdleObserver(this.stkUserActivity);
    }

    window.removeEventListener('homescreenopened',
      this.register_icc_event_idlescreen);

    if (this.icc_events_languageChanged) {
      window.navigator.mozSettings.removeObserver('language.current',
        this.icc_events_languageChanged);
    }

    window.removeEventListener('appterminated',
      this.icc_events_browsertermination);

    eventList.forEach(function(evtId) {
      DUMP('icc_events_register - Registering event:', evtId);
      switch (evtId) {
      case icc._iccManager.STK_EVENT_TYPE_MT_CALL:
      case icc._iccManager.STK_EVENT_TYPE_CALL_CONNECTED:
      case icc._iccManager.STK_EVENT_TYPE_CALL_DISCONNECTED:
        DUMP('icc_events_register - Communications changes event');
        DUMP('icc_events_register message: ' + message);
        DUMP('icc_events_register events: ' + eventList);
        icc_events.registerCallChanged(message, evtId);
        break;
      case icc._iccManager.STK_EVENT_TYPE_LOCATION_STATUS:
        DUMP('icc_events_register - Location changes event');
        this.register_icc_event_voicechange = function(evt) {
          icc_events.handleLocationStatus(message, evt);
        };
        conn.addEventListener('voicechange',
          this.register_icc_event_voicechange);
        break;
      case icc._iccManager.STK_EVENT_TYPE_USER_ACTIVITY:
        DUMP('icc_events_register - User activity event');
        this.stkUserActivity = {
          time: 1,
          onidle: function() {
            DUMP('STK Event - User activity - Going to idle');
          },
          onactive: function() {
            DUMP('STK Event - User activity - Going to active');
            icc_events.handleUserActivityEvent(message);
          }
        };
        navigator.addIdleObserver(this.stkUserActivity);
        break;
      case icc._iccManager.STK_EVENT_TYPE_IDLE_SCREEN_AVAILABLE:
        DUMP('icc_events_register - Idle screen available event');
        this.register_icc_event_idlescreen = function() {
          icc_events.handleIdleScreenAvailableEvent(message);
        };
        window.addEventListener('homescreenopened',
          this.register_icc_event_idlescreen);
        break;
      case icc._iccManager.STK_EVENT_TYPE_CARD_READER_STATUS:
        DUMP('icc_events_register - TODO event: ', evtId);
        break;
      case icc._iccManager.STK_EVENT_TYPE_LANGUAGE_SELECTION:
        DUMP('icc_events_register - Language selection event');
        this.icc_events_languageChanged = function(e) {
          icc_events.handleLanguageSelectionEvent(message, e);
        };
        window.navigator.mozSettings.addObserver('language.current',
          this.icc_events_languageChanged);
        break;
      case icc._iccManager.STK_EVENT_TYPE_BROWSER_TERMINATION:
        DUMP('icc_events_register - Browser termination event');
        this.icc_events_browsertermination = function(e) {
          var app = applications.getByManifestURL(e.detail.origin +
            '/manifest.webapp');
          if (!app) {
            return;
          }
          if (app.manifest.name === 'Browser') {
            icc_events.handleBrowserTerminationEvent(message, e);
          }
        };
        window.addEventListener('appterminated',
          this.icc_events_browsertermination);
        break;
      case icc._iccManager.STK_EVENT_TYPE_DATA_AVAILABLE:
      case icc._iccManager.STK_EVENT_TYPE_CHANNEL_STATUS:
      case icc._iccManager.STK_EVENT_TYPE_SINGLE_ACCESS_TECHNOLOGY_CHANGED:
      case icc._iccManager.STK_EVENT_TYPE_DISPLAY_PARAMETER_CHANGED:
      case icc._iccManager.STK_EVENT_TYPE_LOCAL_CONNECTION:
      case icc._iccManager.STK_EVENT_TYPE_NETWORK_SEARCH_MODE_CHANGED:
      case icc._iccManager.STK_EVENT_TYPE_BROWSING_STATUS:
      case icc._iccManager.STK_EVENT_TYPE_FRAMES_INFORMATION_CHANGED:
        DUMP('icc_events_register - TODO event: ', evtId);
        break;
      }
    }, this);
  }

};
