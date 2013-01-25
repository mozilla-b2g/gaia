'use strict';

function MockThreadList() {
	
	var threadsMockup = [
          {
            senderOrReceiver: '1977',
            body: 'Alo, how are you today, my friend? :)',
            timestamp: getMockupedDate(0),
            unreadCount: 0
          },
          {
            senderOrReceiver: '197746797',
            body: 'Recibido!',
            timestamp: getMockupedDate(1),
            unreadCount: 0
          },
          {
            senderOrReceiver: '436797',
            body: 'Sending :)',
            timestamp: getMockupedDate(2),
            unreadCount: 0
          },
          {
            senderOrReceiver: '1977436979',
            body: 'Nothing :)',
            timestamp: getMockupedDate(2),
            unreadCount: 2
          }
        ];

  threadsMockup.sort(function(a,b){
    return a.timestamp - b.timestamp;
  });

  return threadsMockup;
}