/* global Notification */
/* jshint nonew: false */
'use strict';

(function(exports) {

  const DEFAULT_ICON_URL = 'style/icons/ic_default-notification.png';

  var Receiver = function Receiver() {
  };

  Receiver.prototype = {

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
          session.removeEventListener('message', this._onMessage);
          session.removeEventListener('statechange', this._onStateChange);
        }
      }
    },

    _handleSessionReady: function r_handleSessionReady() {
      var session = navigator.mozPresentation.session;
      session.addEventListener('message', this._onMessage);
      session.addEventListener('statechange', this._onStateChange);
    },

    _renderMessage: function r_renderMessage(message) {
      var result;

      switch(message.type) {
        case 'Message':
        case 'Laundry':
        case 'Home':
        case 'Mail':
          result = {
            body: message.body,
            title: message.title
          };
          break;
      }
      return result;
    },

    _handleMessage: function r_handleMessage(evt) {
      var message = JSON.parse(evt.data);
      var renderedMessage = this._renderMessage(message);

      if (renderedMessage) {
        new Notification(renderedMessage.title, {
          body: renderedMessage.body,
          icon: DEFAULT_ICON_URL
        });
      }
    },

    _handleStateChange: function r_handleStateChange(evt) {
      if (!evt.state) {
        this.uninit();
        window.close();
      }
    }
  };

  exports.Receiver = Receiver;

}(window));
