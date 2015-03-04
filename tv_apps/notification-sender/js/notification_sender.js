/* global Promise */
(function(exports) {
  'use strict';

  function NotificationSender() {}

  NotificationSender.prototype = {

    sendPanel: document.getElementById('send-panel'),
    urlInput: document.getElementById('url-input'),
    connectBtn: document.getElementById('connect-btn'),
    disconnectBtn: document.getElementById('disconnect-btn'),
    stateLabel: document.getElementById('state-label'),
    senderButtons: [],

    init: function ns_init() {
      this.senderButtons =
                Array.from(this.sendPanel.getElementsByTagName('button'));
      this.sendPanel.addEventListener('click', this);
      this.connectBtn.addEventListener('click', this.connect.bind(this));
      this.disconnectBtn.addEventListener('click', this.disconnect.bind(this));
      this.disableButtons(true);
      this._updateSessionState();
    },

    handleEvent: function ns_handleEvent(evt) {
      var target = evt.target;
      switch (evt.type) {
        case 'click':
          if (target.tagName == 'BUTTON') {
            this.sendMessage({
              type: target.dataset.messageType,
              title: target.dataset.messageTitle,
              body: target.dataset.messageBody
            });
          }
          break;
      }
    },

    uninit: function ns_uninit() {

    },

    disableButtons: function ns_switchButtons(disabled) {
      this.senderButtons.forEach(function(button) {
        button.disabled = disabled;
      }, this);
    },

    sendMessage: function ns_sendMessage(message) {
      if (!this.session || !this.session.state) {
        console.log('unable to send message: ' + message);
        return;
      }
      this.session.send(JSON.stringify(message));
    },

    connect: function ns_connect() {
      if(!navigator.mozPresentation) {
        return null;
      }

      return navigator.mozPresentation.startSession(this.urlInput.value).then(

        function onFullfilled(session) {
          this.session = session;
          this.disableButtons(false);
          this.session.onstatechange = this._updateSessionState.bind(this);
          return Promise.resolve();
        }.bind(this),

        function onRejected() {
          console.log('Unable to connect remote.');
          return Promise.reject();
        }
      );
    },

    disconnect: function ns_disconnect() {
      this.session && this.session.disconnect();
      this.disableButtons(true);
      delete this.session;
    },

    _updateSessionState: function ns_updateSessionState() {
      this.stateLabel.textContent =
            (this.session && this.session.state) ? 'connected' : 'disconnected';
    }
  };

  exports.NotificationSender = NotificationSender;
}(window));

