/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global ActivityHandler MessageManager*/
/*exported QuickReplyPanel */
(function(exports) {
'use strict';

var QuickReplyPanel = {
  _activity: null,
  _messageContainer: null,

  init: function qrp_init() {
    this._messageContainer = document.getElementById('message-container-menu');
    this._messageContainer.addEventListener('click',
      this.handleClickEvent.bind(this));
  },

  beforeEnter: function qrp_beforeEnter(args) {
    this._activity = args.activity;
    this._messageContainer.hidden = false;

    return Promise.resolve();
  },

  afterLeave: function qrp_afterLeave(args) {
    this._activity = null;
    this._messageContainer = null;
  },

  handleClickEvent: function qrp_handleClickEvent(evt) {
    this._messageContainer.hidden = true;

    var target = evt.target;
    if (target.classList.contains('message')) {
      var smsMessage = target.textContent;
      this.sendDeclineMessage('message', smsMessage);
    } else if (target.id === 'customize-sms') {
      this.sendDeclineMessage('customize-sms');
    } else if (target.id === 'sms-cancel') {
      ActivityHandler.leaveActivity();
    }
  },

  sendDeclineMessage: function qrp_sendDeclineMessage(type, smsMessage) {
    var recipient = this._activity.source.data.number;

    if (type == 'message') {
      // Default cardIndex
      var cardIndex = this._activity.source.data.serviceId;

      if (!cardIndex) {
        cardIndex = 0;
      }

      var opts = {
        recipients: recipient,
        serviceId: cardIndex,
        content: smsMessage
      };

      MessageManager.sendSMS(opts);
    } else if (type == 'customize-sms') {
      try {
        new MozActivity({
          name: 'new',
          data: {
            type: 'websms/sms',
            number: recipient
          }
        });
      } catch (e) {
        console.log('WebActivities unavailable? : ' + e);
      }
    }

    // End SMS app while callscreen is ended
    // Send end call message to callscreen
    navigator.mozApps.getSelf().onsuccess = function gotSelf(evt) {
      var app = evt.target.result;

      if (!app.connect) {
        return;
      }

      app.connect('declinemessage').then(function onConnAccepted(ports) {
        ports.forEach(function(port) {
          var message = {
            state: 'end-call'
          };
          port.postMessage(message);
          if (type !== 'customize-sms') {
            ActivityHandler.leaveActivity();
          }
        });
      });
    };
  }
};

exports.QuickReplyPanel = QuickReplyPanel;

}(this));
