/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */


/* global MessageManager */

/* exported MapManager */

/*
<MAP-msg-listing version = "1.0">
  <msg handle = "20000100001"
       subject = "Hello"
       datetime = "20071213T130510"
       sender_name = "Jamie"
       sender_addressing = "+1-987-6543210"
       recipient_addressing = "+1-0123-456789"
       type = "SMS_GSM"
       size = "256"
       attachment_size = "0"
       priority = "no"
       read = "yes"
       sent = "no"
       protected = "no"/>
  <msg handle = "20000100000"
       subject = "Bonjour"
       datetime = "20071215T171204"
       sender_name = "Marc"
       sender_addressing = "marc@carworkinggroup.bluetooth"
       recipient_addressing = "burch@carworkinggroup.bluetooth"
       type = "EMAIL"
       size = "1032"
       attachment_size = "0"
       priority = "yes"
       read = "yes"
       sent = "no"
       protected = "yes"/>
</MAP-msg-listing>

MozMmsMessage: {
  type: "mms",
  id: 390,
  threadId: 39,
  iccId: null,
  delivery: "sent",
  deliveryInfo: Array[1],
  sender: null,
  receivers: Array[1],
  timestamp: 1372341098084,
  sentTimestamp: 0
}
*/

'use strict';
(function (exports) {
var MapManager = {
  init() {
    MessageManager.on('message-sent', this.onSendingSuccess.bind(this));
    MessageManager.on('message-delivered', this.onDeliverySuccess.bind(this));
    MessageManager.on('message-received', this.onNewMessage.bind(this));
  },

  onSendingSuccess() {},

  onDeliverySuccess() {},

  onNewMessage() {},

  filterGenerator() {},

  _msgTemplate(msg) {
    return `<msg handle = "${msg.id}" subject = "${msg.subject}" ` +
           `datetime = "${msg.datetime}" ` +
           `sender_name = "${msg.sender_name}" ` +
           `sender_addressing = "${msg.sender_addressing}" ` +
           `recipient_name = "${msg.recipient_name}" ` +
           `recipient_addressing = "${msg.recipient_addressing}" ` +
           `type = "${msg.type}" ` +
           `size = "${msg.size}" ` +
           `text = "${msg.text}" ` +
           `attachment_size = "${msg.attachment_size}" ` +
           `priority = "${msg.priority}" ` +
           `read = "${msg.read}" ` +
           `sent = "${msg.sent}" ` +
           `protected = "${msg.protected}"/>\n`;
  },

  _getOwnerInfo() {
    return {
      name: 'local',
      addressing: '000000123'
    };
  },

  _reformatMsg(msgBrief, msgRecord, options) {
    function generateDate(ts) {
      return new Date(ts).toISOString().replace(/[-:]/ig, '').split('.')[0];
    }
    var msgTemplate = {
      id: msgBrief.id,
      datetime: generateDate(msgBrief.timestamp),
      priority: 'no',
      text: 'yes',
      read: msgRecord.read ? 'yes' : 'no',
      protected: 'no'
    };

    if (msgBrief.type === 'sms') {
      // XXX probably SMS_CDMA, [MAP Spec V12, p20]
      msgTemplate.type = 'SMS_GSM';
      msgTemplate.subject = msgRecord.body.substring(0, options.subjectLength);
      msgTemplate.size = msgRecord.body.length;
      msgTemplate.attachment_size = 0;
    } else if (msgBrief.type === 'mms') {
      /*
      msgTemplate.type = 'MMS';
      msgTemplate.subject = '',
      msgTemplate.size = 0;
      msgTemplate.attachment_size = 0; // XXX mms option, support later
      */
      return Promise.resolve(null);
    }

    var ownInfo = this._getOwnerInfo();

    switch(msgRecord.delivery) {
    case 'sent':
      msgTemplate.sender_name = ownInfo.name;
      msgTemplate.sender_addressing = ownInfo.addressing;
      msgTemplate.recipient_name = msgRecord.receiver;
      msgTemplate.recipient_addressing = msgRecord.receiver;
      msgTemplate.sent = 'yes';
      break;
    case 'received':
      msgTemplate.sender_name = msgRecord.sender;
      msgTemplate.sender_addressing = msgRecord.sender;
      msgTemplate.recipient_name = ownInfo.name;
      msgTemplate.recipient_addressing = ownInfo.addressing;
      msgTemplate.sent = 'no';
      break;
    case 'sending':
      msgTemplate.sender_name = ownInfo.name;
      msgTemplate.sender_addressing = ownInfo.addressing;
      msgTemplate.recipient_name = msgRecord.receiver;
      msgTemplate.recipient_addressing = msgRecord.receiver;
      msgTemplate.sent = 'no';
      break;
    case 'error':
      console.error('Error when deliverting.');
      return Promise.reject(new Error('Error when deliverting.'));
    default:
      console.error('Unknown delivery status.');
      return Promise.reject(new Error('Unknown delivery status.'));
    }

    return Promise.resolve(this._msgTemplate(msgTemplate));
  },

  getMessagesListXML(options) {
    const MAP_LISTING_HEAD = '<MAP-msg-listing version = "1.0">\n';
    const MAP_LISTING_FOOT = '</MAP-msg-listing>\n';
    var ret = MAP_LISTING_HEAD;
    var promises = [];
    return new Promise(resolve => {
      MessageManager.getMessages({
        each: msgBrief => {
          var p = MessageManager.getMessage(msgBrief.id).then(msgRecord => {
            return this._reformatMsg(msgBrief, msgRecord, options);
          });
          promises.push(p);
        },
        end: () => {},
        done: () => {
          Promise.all(promises).then(msgs => {
            for (var i in msgs) {
              if (msgs[i]) {
                ret += msgs[i];
              }
            }
            ret += MAP_LISTING_FOOT;
            resolve(ret);
          });
        },
        filter: {}
      });
    });
  }
};
exports.MapManager = MapManager;
})(window);
