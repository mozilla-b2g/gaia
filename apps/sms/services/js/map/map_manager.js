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

var managerBt = navigator.mozBluetooth;
var adapter;

const MAP_LISTING_HEAD = '<MAP-msg-listing version = "1.0">\n';
const MAP_LISTING_FOOT = '</MAP-msg-listing>\n';
const MAP_REPORT_HEAD = '<MAP-event-report version = "1.0">\n';
const MAP_REPORT_FOOT = '</MAP-event-report>\n';

(function (exports) {
var MapManager = {
  init() {
    var bind_event = () => {
      adapter.addEventListener('mapmessageslistingreq',
        this.mapmessageslistingreq.bind(this));
      adapter.addEventListener('mapgetmessagereq',
        this.mapgetmessagereq.bind(this));
      adapter.addEventListener('mapsetmessagestatusreq',
        this.mapsetmessagestatusreq.bind(this));
      adapter.addEventListener('mappushmessagereq',
        this.mappushmessagereq.bind(this));
      adapter.addEventListener('mapmessageupdatereq',
        this.mapmessageupdatereq.bind(this));
    };
    if (managerBt.defaultAdapter) {
      adapter = managerBt.defaultAdapter;
      bind_event();
    } else {
      var req = managerBt.getDefaultAdapter();
      req.onsuccess = function bt_getAdapterSuccess() {
        adapter = req.result;
        bind_event();
      };
      req.onerror = function bt_getAdapterFailed() {
        console.error('MAP', 'ERROR adapter');
      };
    }

    MessageManager.on('message-sent', this.onSendingSuccess.bind(this));
    MessageManager.on('message-delivered', this.onDeliverySuccess.bind(this));
    MessageManager.on('message-received', this.onNewMessage.bind(this));
  },

  mapmessageslistingreq(evt) {
    console.log('[map]' ,'mapmessageslisting');
    console.log(evt);
    console.log('[map]' ,'maxlistcount: '+ evt.maxListCount +
      ', recipient: ' + evt.filterRecipient);

    this.getMessagesListXML(evt).then(data => {
      console.log();
      var properties = {
        type: 'text/xml'
      };
      console.log('[map]' ,'getMessagesListXML');
      console.log(data);
      console.log('[map]' ,'A');
      var contentXml = evt.maxlistcount === 0 ?
          MAP_LISTING_HEAD + MAP_LISTING_FOOT : data.xml;
      var blob = new Blob([contentXml], properties);
      console.log('[map]' ,'B');
      evt.handle.replyToMessagesListing(0, blob, false,
        '201510151020', data.size);
      console.log('[map]' ,'C');
    });
  },

  mapgetmessagereq(evt) {
    console.log('mapgetmessagereq');
    console.log(evt);
  },

  mapsetmessagestatusreq(evt) {
    console.log('mapsetmessagestatusreq');
    console.log(evt);
  },

  mappushmessagereq(evt) {
    console.log('mappushmessagereq');
    console.log(evt);
  },

  mapmessageupdatereq(evt) {
    console.log('mapmessageupdatereq');
    console.log(evt);
  },

  onSendingSuccess(e) {
    console.log('onSendingSuccess');
    console.log(e);
    var msgRecord = e.message, msgTemplate = {};
    if (msgRecord.type === 'sms') {
      msgTemplate.type = 'SMS_GSM';
    } else if (msgRecord.type === 'mms') {
      msgTemplate.type = 'MMS';
    }
    msgTemplate.handle = msgRecord.id;

    var content = `<event type = "SendingSuccess" ` +
                  `handle = "${msgTemplate.handle}" ` +
                  `folder = "TELECOM/MSG/OUTBOX" ` +
                  `msg_type = "${msgTemplate.type}" />\n`;
    console.log(MAP_REPORT_HEAD + content + MAP_REPORT_FOOT);
  },

  onDeliverySuccess(e) {
    console.log('onDeliverySuccess');
    console.log(e);
    var msgRecord = e.message, msgTemplate = {};
    if (msgRecord.type === 'sms') {
      msgTemplate.type = 'SMS_GSM';
    } else if (msgRecord.type === 'mms') {
      msgTemplate.type = 'MMS';
    }
    msgTemplate.handle = msgRecord.id;

    var content = `<event type = "DeliverySuccess" ` +
                  `handle = "${msgTemplate.handle}" ` +
                  `folder = "TELECOM/MSG/OUTBOX" ` +
                  `msg_type = "${msgTemplate.type}" />\n`;
    console.log(MAP_REPORT_HEAD + content + MAP_REPORT_FOOT);
  },

  onNewMessage(e) {
    console.log('onNewMessage');
    console.log(e);
    var msgRecord = e.message, msgTemplate = {};
    if (msgRecord.type === 'sms') {
      msgTemplate.type = 'SMS_GSM';
    } else if (msgRecord.type === 'mms') {
      msgTemplate.type = 'MMS';
    }
    msgTemplate.handle = msgRecord.id;

    var content = `<event type = "NewMessage" ` +
                  `handle = "${msgTemplate.handle}" ` +
                  `folder = "TELECOM/MSG/INBOX" ` +
                  `msg_type = "${msgTemplate.type}" />\n`;
    console.log(MAP_REPORT_HEAD + content + MAP_REPORT_FOOT);
  },

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
    var ret = MAP_LISTING_HEAD;
    var promises = [];
    return new Promise(resolve => {
      MessageManager.getMessages({
        each: msgBrief => {
          console.log(promises.length);
          console.log(msgBrief);
          if (promises.length > 3) {
            return;
          }
          if (msgBrief.type !== 'sms') {
            return;
          }
          var p = MessageManager.getMessage(msgBrief.id).then(msgRecord => {
            return this._reformatMsg(msgBrief, msgRecord, options);
          });
          promises.push(p);
        },
        end: () => {},
        done: () => {
          Promise.all(promises).then(msgs => {
            console.log(msgs);
            for (var i in msgs) {
              console.log(msgs[i]);
              if (msgs[i]) {
                ret += msgs[i];
              }
            }
            ret += MAP_LISTING_FOOT;
            resolve({
              xml: ret,
              size: promises.length
            });
          });
        },
        filter: {}
      });
    });
  }
};
exports.MapManager = MapManager;
})(window);
