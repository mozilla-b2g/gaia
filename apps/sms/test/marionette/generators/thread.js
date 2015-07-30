'use strict';

/* global module */

// TODO(gaye): This is no bueno and we need to fix.
var _ = require('SMS/node_modules/lodash');

var ThreadGenerator = {
  uniqueThreadId: 0,
  uniqueMessageId: 0,

  generate: function(parameters) {

    var DEFAULT_PARAMETERS = {
      numberOfMessages: 1,
      messageType: 'sms',
      participants: ['+123'],
      body: 'Thread message content'
    };

    parameters = _.assign(DEFAULT_PARAMETERS, parameters);

    var thread = {
      id: ++ThreadGenerator.uniqueThreadId,
      body: parameters.body,
      lastMessageType: parameters.messageType,
      timestamp: Date.now(),
      messages: [],
      participants: parameters.participants
    };

    for (var i = 0; i < parameters.numberOfMessages; i++) {
      var id = ++ThreadGenerator.uniqueMessageId;
      thread.messages.push({
        id: id,
        iccId: null,
        threadId: thread.id,
        sender: null,
        receiver: parameters.participants[0],
        type: parameters.messageType,
        delivery: 'sent',
        body: thread.body + ' (messageId: ' + id + ')',
        timestamp: Date.now()
      });
    }

    return thread;
  }

};

module.exports = ThreadGenerator;
