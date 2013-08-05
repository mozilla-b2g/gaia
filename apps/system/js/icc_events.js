/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var icc_events = {
  downloadEvent: function icc_events_downloadEvent(eventObject) {
    DUMP('icc_events_downloadEvent: Downloading event:', eventObject);
    icc._icc.sendStkEventDownload(eventObject);
  },

  handleLocationStatus: function icc_events_handleLocationStatus(evt) {
    if (evt.type != 'voicechange') {
      return;
    }
    var conn = window.navigator.mozMobileConnection;
    DUMP(' STK Location changed to MCC=' + IccHelper.iccInfo.mcc +
      ' MNC=' + IccHelper.iccInfo.mnc +
      ' LAC=' + conn.voice.cell.gsmLocationAreaCode +
      ' CellId=' + conn.voice.cell.gsmCellId +
      ' Status/Connected=' + conn.voice.connected +
      ' Status/Emergency=' + conn.voice.emergencyCallsOnly);
    var status = icc._icc.STK_SERVICE_STATE_UNAVAILABLE;
    if (conn.voice.connected) {
      status = icc._icc.STK_SERVICE_STATE_NORMAL;
    } else if (conn.voice.emergencyCallsOnly) {
      status = icc._icc.STK_SERVICE_STATE_LIMITED;
    }
    this.downloadEvent({
      eventType: icc._icc.STK_EVENT_TYPE_LOCATION_STATUS,
      locationStatus: status,
      locationInfo: {
        mcc: IccHelper.iccInfo.mcc,
        mnc: IccHelper.iccInfo.mnc,
        gsmLocationAreaCode: conn.voice.cell.gsmLocationAreaCode,
        gsmCellId: conn.voice.cell.gsmCellId
      }
    });
  },

  handleCallsChanged: function icc_events_handleCallsChanged(evt) {
    if (evt.type != 'callschanged') {
      return;
    }
    DUMP(' STK Communication changed');
    var self = this;
    window.navigator.mozTelephony.calls.forEach(function callIterator(call) {
      DUMP(' STK:CALLS State change: ' + call.state);
      var outgoing = call.state == 'incoming';
      if (call.state == 'incoming') {
        self.downloadEvent({
          eventType: icc._icc.STK_EVENT_TYPE_MT_CALL,
          number: call.number,
          isIssuedByRemote: outgoing,
          error: null
        });
      }
      call.addEventListener('error', function callError(err) {
        self.downloadEvent({
          eventType: icc._icc.STK_EVENT_TYPE_CALL_DISCONNECTED,
          number: call.number,
          error: err
        });
      });
      call.addEventListener('statechange', function callStateChange() {
        DUMP(' STK:CALL State Change: ' + call.state);
        switch (call.state) {
          case 'connected':
            self.downloadEvent({
              eventType: icc._icc.STK_EVENT_TYPE_CALL_CONNECTED,
              number: call.number,
              isIssuedByRemote: outgoing
            });
            break;
          case 'disconnected':
            call.removeEventListener('statechange', callStateChange);
            self.downloadEvent({
              eventType: icc._icc.STK_EVENT_TYPE_CALL_DISCONNECTED,
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
    function icc_events_handleLanguageSelectionEvent(evt) {
      DUMP(' STK Language selection = ' + evt.settingValue);
      this.downloadEvent({
        eventType: icc._icc.STK_EVENT_TYPE_LANGUAGE_SELECTION,
        language: evt.settingValue.substring(0, 2)
      });
  },

  register: function icc_events_register(eventList) {
    DUMP('icc_events_register - Events list:', eventList);
    for (var evt in eventList) {
      DUMP('icc_events_register - Registering event:', eventList[evt]);
      switch (eventList[evt]) {
      case icc._icc.STK_EVENT_TYPE_MT_CALL:
      case icc._icc.STK_EVENT_TYPE_CALL_CONNECTED:
      case icc._icc.STK_EVENT_TYPE_CALL_DISCONNECTED:
        DUMP('icc_events_register - Communications changes event');
        var comm = window.navigator.mozTelephony;
        comm.addEventListener('callschanged',
          function register_icc_event_callscahanged(evt) {
            icc_events.handleCallsChanged(evt);
          });
        break;
      case icc._icc.STK_EVENT_TYPE_LOCATION_STATUS:
        DUMP('icc_events_register - Location changes event');
        var conn = window.navigator.mozMobileConnection;
        conn.addEventListener('voicechange',
          function register_icc_event_voicechange(evt) {
            icc_events.handleLocationStatus(evt);
          });
        break;
      case icc._icc.STK_EVENT_TYPE_USER_ACTIVITY:
      case icc._icc.STK_EVENT_TYPE_IDLE_SCREEN_AVAILABLE:
      case icc._icc.STK_EVENT_TYPE_CARD_READER_STATUS:
        DUMP('icc_events_register - TODO event: ', eventList[evt]);
        break;
      case icc._icc.STK_EVENT_TYPE_LANGUAGE_SELECTION:
        DUMP('icc_events_register - Language selection event');
        var self = this;
        window.navigator.mozSettings.addObserver('language.current',
          function icc_events_languageChanged(e) {
            self.handleLanguageSelectionEvent(e);
          });
        break;
      case icc._icc.STK_EVENT_TYPE_BROWSER_TERMINATION:
      case icc._icc.STK_EVENT_TYPE_DATA_AVAILABLE:
      case icc._icc.STK_EVENT_TYPE_CHANNEL_STATUS:
      case icc._icc.STK_EVENT_TYPE_SINGLE_ACCESS_TECHNOLOGY_CHANGED:
      case icc._icc.STK_EVENT_TYPE_DISPLAY_PARAMETER_CHANGED:
      case icc._icc.STK_EVENT_TYPE_LOCAL_CONNECTION:
      case icc._icc.STK_EVENT_TYPE_NETWORK_SEARCH_MODE_CHANGED:
      case icc._icc.STK_EVENT_TYPE_BROWSING_STATUS:
      case icc._icc.STK_EVENT_TYPE_FRAMES_INFORMATION_CHANGED:
        DUMP('icc_events_register - TODO event: ', eventList[evt]);
        break;
      }
    }
  }

};
