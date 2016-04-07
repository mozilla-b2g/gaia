'use strict';

/* global module */

// TODO(gaye): This is no bueno and we need to fix.
var _ = require('SMS/node_modules/lodash');

var DEFAULT_THREAD_PARAMETERS = {
  numberOfMessages: 1,
  messageType: 'sms',
  participants: ['+123'],
  body: 'Thread message content',
  baseTimestamp: Date.now()
};

var DEFAULT_MESSAGE = {
  iccId: null,
  sender: null,
  delivery: 'sent',
  timestamp: 0,
  sentTimestamp: 0,
  read: false
};

var DEFAULT_SMS = _.assign({
  type: 'sms',
  body: 'Thread message content',
  receiver: null,
  messageClass: 'class-1',
  deliveryStatus: 'not-applicable',
  deliveryTimestamp: 0
}, DEFAULT_MESSAGE);

var DEFAULT_MMS = _.assign({
  type: 'mms',
  receivers: [],
  deliveryInfo: [{ deliveryStatus: 'not-applicable' }],
  subject: 'Message subject',
  smil: null,
  attachments: [],
  expiryDate: 0,
  readReportRequested: false
}, DEFAULT_MESSAGE);

var ThreadGenerator = {
  uniqueThreadId: 0,
  uniqueMessageId: 0,

  generate: function(parameters) {
    parameters = _.assign({}, DEFAULT_THREAD_PARAMETERS, parameters);

    var thread = {
      id: ++ThreadGenerator.uniqueThreadId,
      body: parameters.body,
      lastMessageType: parameters.messageType,
      timestamp: parameters.baseTimestamp,
      messages: [],
      participants: parameters.participants
    };

    for (var i = 0; i < parameters.numberOfMessages; i++) {
      var message = null;
      var messageBody = thread.body + ' (threadId: ' + thread.id + ')';
      if (i) {
        messageBody +=
          ' (messageId: ' + (ThreadGenerator.uniqueMessageId + 1) + ')';
      }

      if (parameters.messageType === 'sms') {
        message = this.generateSMS({
          threadId: thread.id,
          receiver:  parameters.participants[0],
          delivery: parameters.delivery,
          body: messageBody,
          timestamp: parameters.baseTimestamp - i * 10000
        });
      } else {
        message = this.generateMMS({
          threadId: thread.id,
          receivers: parameters.participants,
          delivery: parameters.delivery,
          expiryDate: parameters.expiryDate,
          timestamp: parameters.baseTimestamp - i * 10000,
          subject: parameters.subject,
          attachments: parameters.attachments || [{
            type: 'text/plain', content: messageBody
          }]
        });
      }

      thread.messages.push(message);
    }

    thread.timestamp = thread.messages[0].timestamp;

    return thread;
  },

  generateSMS: function(smsParameters) {
    if (!smsParameters.threadId) {
      throw new Error('ThreadId should be specified!');
    }

    return _.assign(
      { id: smsParameters.id || ++ThreadGenerator.uniqueMessageId },
      DEFAULT_SMS,
      smsParameters
    );
  },

  generateMMS: function(mmsParameters) {
    if (!mmsParameters.threadId) {
      throw new Error('ThreadId should be specified!');
    }

    return _.assign(
      { id: mmsParameters.id || ++ThreadGenerator.uniqueMessageId },
      DEFAULT_MMS,
      mmsParameters
    );
  }
};

module.exports = ThreadGenerator;
