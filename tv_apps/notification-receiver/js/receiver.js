/* global Notification */
/* jshint nonew: false */
'use strict';

(function(exports) {

  const DEFAULT_ICON_URL = 'style/icons/ic_default-notification.png';
  const DEBUG = 0;

  var Receiver = function Receiver() {};

  Receiver.prototype = {

    _onMessage: undefined,
    _onStateChange: undefined,
    _session: undefined,

    init: function r_init() {
      this._onMessage = this._handleMessage.bind(this);
      this._onStateChange = this._handleStateChange.bind(this);

      navigator.presentation &&
                              navigator.presentation.receiver.getSession().then(
      function addSession(session) {
        this._session = session;
        this._session.addEventListener('message', this._onMessage);
        this._session.addEventListener('statechange', this._onStateChange);
      }.bind(this),
      function sessionError() {
        console.warn('Getting session failed.');
      });
    },

    uninit: function r_uninit() {
      if (this._session) {
        this._session.removeEventListener('message', this._onMessage);
        this._session.removeEventListener('statechange', this._onStateChange);
        this._session = null;
      }
    },

    _renderMessage: function r_renderMessage(message) {
      var result;
      switch(message.type) {
        case 'view':
          this.sendViewUrl(message.url);
          break;
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

    sendViewUrl: function r_sendViewUrl(targetUrl) {
      navigator.mozApps.getSelf().onsuccess = function(evt) {
        var selfApp = evt.target.result;
        var iacmsg = {
          type: 'view',
          data: {
            type: 'url',
            url: targetUrl,
          }
        };
        selfApp.connect('webpage-open').then(function (ports) {
          ports.forEach(function(port) {
            port.postMessage(iacmsg);
          });
        }.bind(this),
        function () {
          console.warn('Sending view request failed.');
        });
      }.bind(this);
    },

    _handleMessage: function r_handleMessage(evt) {
      DEBUG && console.log('Got message:' + evt.data);
      var message = JSON.parse(evt.data);
      var renderedMessage = this._renderMessage(message);

      if (renderedMessage) {
        new Notification(renderedMessage.title, {
          body: renderedMessage.body,
          icon: DEFAULT_ICON_URL
        });
      }
    },

    _handleStateChange: function r_handleStateChange() {
      DEBUG && console.log('session state:' + this._session.state);
      if(this._session.state !== 'connected') {
        this.uninit();
        window.close();
      }
    }
  };

  exports.Receiver = Receiver;

}(window));
