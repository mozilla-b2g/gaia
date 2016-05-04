/*global getMockupedDate */
/*exported MockThreadMessages */

'use strict';

function MockThreadMessages() {

  var messagesMockup = [
    {
      sender: null,
      receiver: '197746797',
      body: 'Error message:)',
      delivery: 'sending',
      deliveryInfo: [{
        receiver: '197746797',
        deliveryStatus: 'pending',
        deliveryTimestamp: null,
        readStatus: 'not-applicable',
        readTimestamp: null
      }],
      error: true,
      id: 47,
      threadId: 1,
      timestamp: +getMockupedDate(0)
    },
    {
      sender: null,
      receiver: '197746797',
      body: 'Nothing :)',
      delivery: 'sent',
      deliveryInfo: [{
        receiver: '197746797',
        deliveryStatus: 'success',
        deliveryTimestamp: +getMockupedDate(0),
        readStatus: 'not-applicable',
        readTimestamp: null
      }],
      id: 46,
      threadId: 1,
      timestamp: +getMockupedDate(0)
    },
    {
      sender: '197746797',
      body: 'Recibido!',
      delivery: 'received',
      id: 40,
      threadId: 1,
      timestamp: +getMockupedDate(2)
    },
    {
      sender: null,
      receiver: '197746797',
      body: 'Nothing :)',
      delivery: 'error',
      deliveryInfo: [{
        receiver: '197746797',
        deliveryStatus: 'errpr',
        deliveryTimestamp: null,
        readStatus: 'not-applicable',
        readTimestamp: null
      }],
      id: 460,
      threadId: 1,
      timestamp: +getMockupedDate(6)
    },
    {
      sender: null,
      receiver: '197746797',
      body: 'Nothing at all :)',
      delivery: 'error',
      deliveryInfo: [{
        receiver: '197746797',
        deliveryStatus: 'error',
        deliveryTimestamp: null,
        readStatus: 'not-applicable',
        readTimestamp: null
      }],
      id: 461,
      threadId: 1,
      timestamp: +getMockupedDate(6)
    }];

  messagesMockup.sort(function(a, b) {
    return b.timestamp - a.timestamp;
  });

  return messagesMockup;
}
