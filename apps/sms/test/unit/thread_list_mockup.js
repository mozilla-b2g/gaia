'use strict';

function MockThreadList() {
  // These Threads are not sorted in order to check that rendering
  // is working as expected, adding each thread to the right container.
  var threadsMockup = [
          {
            senderOrReceiver: '1977',
            body: 'Alo, how are you today, my friend? :)',
            timestamp: getMockupedDate(0),
            unreadCount: 0
          },
          {
            senderOrReceiver: '436797',
            body: 'Sending :)',
            timestamp: getMockupedDate(2),
            unreadCount: 0
          },
          {
            senderOrReceiver: '197746797',
            body: 'Recibido!',
            timestamp: getMockupedDate(1),
            unreadCount: 0
          },
          {
            senderOrReceiver: '1977436979',
            body: 'Nothing :)',
            timestamp: getMockupedDate(2),
            unreadCount: 2
          }
        ];

  return threadsMockup;
}
