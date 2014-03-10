/*global getMockupedDate */
/*exported MockThreadList */
/*exported MockThreadListBySize */

'use strict';

function MockThreadList() {
  // These Threads are not sorted in order to check that rendering
  // is working as expected, adding each thread to the right container.
  var threadsMockup = [
          {
            id: 1,
            participants: ['1977'],
            lastMessageType: 'sms',
            body: 'Alo, how are you today, my friend? :)',
            timestamp: +getMockupedDate(0),
            unreadCount: 0
          },
          {
            id: 2,
            participants: ['436797'],
            lastMessageType: 'sms',
            body: 'Sending :)',
            timestamp: +getMockupedDate(2),
            unreadCount: 0
          },
          {
            id: 3,
            participants: ['197746797'],
            lastMessageType: 'sms',
            body: 'Recibido!',
            timestamp: +getMockupedDate(1),
            unreadCount: 0
          },
          {
            id: 4,
            participants: ['1977436979'],
            lastMessageType: 'mms',
            body: 'Nothing :)',
            timestamp: +getMockupedDate(2),
            unreadCount: 2
          },
          {
            id: 5,
            participants: ['999', '888', '777'],
            lastMessageType: 'sms',
            body: '...',
            timestamp: +getMockupedDate(3),
            unreadCount: 0
          }
        ];

  return threadsMockup;
}

function MockThreadListBySize(size) {
  var threadTemplate = {
    id: 1,
    participants: ['1977'],
    lastMessageType: 'sms',
    body: 'Bogus Message',
    timestamp: +getMockupedDate(0),
    unreadCount: 0
  };

  var threadList = [];
  for (var i = 1; i <= size; i++) {
    var thread = JSON.parse(JSON.stringify(threadTemplate));
    thread.id = i;
    thread.participants = ['1977'+i];
    threadList.push(thread);
  }
  
  return threadList;
}