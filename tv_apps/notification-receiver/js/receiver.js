/* global Notification */
/* jshint nonew: false */
'use strict';

(function(exports) {

  const DEFAULT_ICON_URL = 'style/icons/ic_default-notification.png';

  var Receiver = function Receiver() {
  };

  Receiver.prototype = {

    _MESSAGE_TYPES: Object.freeze({
      'start-ringing': {
        title: 'Incoming call',
        bodyTemplate: '__SENDER__ calling'
      },
      'stop-ringing': {
        title: 'Call ended',
        bodyTemplate: '__SENDER__ call ended'
      },
      'sms': {
        title: 'Message received',
        bodyTemplate: '__SENDER__: __MESSAGE__'
      }
    }),

    _onSessionReady: undefined,
    _onMessage: undefined,
    _onStateChange: undefined,

    init: function r_init() {
      this._onSessionReady = this._handleSessionReady.bind(this);
      this._onMessage = this._handleMessage.bind(this);
      this._onStateChange = this._handleStateChange.bind(this);

      if (navigator.mozPresentation) {
        if (navigator.mozPresentation.session) {
          this._onSessionReady();
        } else {
          navigator.mozPresentation.addEventListener('sessionready',
            this._onSessionReady);
        }
      }
    },

    uninit: function r_uninit() {
      if (navigator.mozPresentation) {
        navigator.mozPresentation.removeEventListener('sessionready',
          this._onSessionReady);

        var session = navigator.mozPresentation.session;
        if (session) {
          // XXX: message is an exception that we could not use addEventListener
          // on it. See http://bugzil.la/1128384
          session.onmessage = undefined;
          session.removeEventListener('statechange', this._onStateChange);
        }
      }
    },

    _handleSessionReady: function r_handleSessionReady() {
      var session = navigator.mozPresentation.session;
      // XXX: message is an exception that we could not use addEventListener
      // on it. See http://bugzil.la/1128384
      session.onmessage = this._onMessage;
      session.addEventListener('statechange', this._onStateChange);
    },

    _isKnownType: function r_isKnownType(type) {
      return !!this._MESSAGE_TYPES[type];
    },

    _renderMessageBody: function r_renderMessageBody(message) {
      var bodyTemplate = this._MESSAGE_TYPES[message.type].bodyTemplate;
      var body;
      var sender;
      if (message.name) {
        sender = message.name;
      } else {
        sender = message.callingParty;
      }
      switch(message.type) {
        case 'start-ringing':
        case 'stop-ringing':
          body = bodyTemplate.replace('__SENDER__', sender);
          break;
        case 'sms':
          body = bodyTemplate.replace('__SENDER__', sender)
                  .replace('__MESSAGE__', message.body);
          break;
      }
      return body;
    },

    // We assume incoming message event are in string format below for now:
    // 1. {data: {"callingParty":"0987654321", "type":"start-ringing"}}
    // 2. {data: {"callingParty":"0987654321", "type":"stop-ringing"}}
    // 3. {
    //      data: {
    //        "callingParty":"+886987654321",
    //        "name":null,
    //        "type":"sms",
    //        "body":"Test"
    //      }
    //    }
    // Message format is subject to change.
    _handleMessage: function r_handleMessage(evt) {
      var message = JSON.parse(evt.data);
      var type = message.type;

      if (this._isKnownType(type)) {
        var title = this._MESSAGE_TYPES[type].title;

        new Notification(title, {
          body: this._renderMessageBody(message), icon: DEFAULT_ICON_URL
        });
      }
    },

    _handleStateChange: function r_handleStateChange(evt) {
      if (evt.state === 'disconnected') {
        this.uninit();
        window.close();
      }
    }
  };

  exports.Receiver = Receiver;

}(window));
