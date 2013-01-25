/* ***********************************************************

  Code below is for desktop testing!

*********************************************************** */
if (!navigator.mozSms) {

  // We made up a fake database on
  var messagesHack = [], threadsHack = [];
  (function() {
    var messages = [
      {
        sender: null,
        receiver: '1977',
        body: 'Alo, how are you today, my friend? :)',
        delivery: 'sent',
        id: 52,
        read: true,
        timestamp: new Date(Date.now())
      },
      {
        sender: null,
        receiver: '1977',
        body: 'arr :)',
        delivery: 'sent',
        id: 511,
        read: true,
        timestamp: new Date(Date.now() - 8400000000)
      },
      {
        sender: null,
        receiver: '436797',
        body: 'Sending :)',
        delivery: 'sending',
        id: 51,
        timestamp: new Date(Date.now() - 172800000)
      },
      {
        sender: null,
        receiver: '197743697',
        body: 'Nothing :)',
        delivery: 'sent',
        id: 48,
        timestamp: new Date(Date.now() - 652800000)
      },
      {
        sender: null,
        receiver: '197746797',
        body: 'Error message:)',
        delivery: 'sending',
        error: true,
        id: 47,
        timestamp: new Date(Date.now() - 822800000)
      },
      {
        sender: null,
        receiver: '197746797',
        body: 'Nothing :)',
        delivery: 'sent',
        id: 46,
        timestamp: new Date(Date.now() - 1002800000)
      },
      {
        sender: null,
        receiver: '197746797',
        body: 'Nothing :)',
        delivery: 'error',
        id: 460,
        timestamp: new Date(Date.now() - 1002800000)
      },
      {
        sender: '197746797',
        body: 'Recibido!',
        delivery: 'received',
        id: 40,
        timestamp: new Date(Date.now() - 50000000)
      }
    ];

    for (var i = 0; i < 15; i++) {
      messages.push({
        sender: '14886783487',
        body: 'Hello world!',
        delivery: 'received',
        id: 39 - i,
        timestamp: new Date(Date.now() - 60000000)
      });
    }

    messagesHack = messages;

    // Creating threads:
    threadsHack = [
      {
        senderOrReceiver: '1977',
        body: 'Alo, how are you today, my friend? :)',
        timestamp: new Date(Date.now()),
        unreadCount: 0
      },
      {
        senderOrReceiver: '436797',
        body: 'Sending :)',
        timestamp: new Date(Date.now() - 172800000),
        unreadCount: 0
      },
      {
        senderOrReceiver: '197743697',
        body: 'Nothing :)',
        timestamp: new Date(Date.now() - 652800000),
        unreadCount: 0
      },
      {
        senderOrReceiver: '197746797',
        body: 'Recibido!',
        timestamp: new Date(Date.now() - 50000000),
        unreadCount: 0
      },
      {
        senderOrReceiver: '14886783487',
        body: 'Hello world!',
        timestamp: new Date(Date.now() - 60000000),
        unreadCount: 2
      }
    ] 
  })();

  var GetMessagesHack = function gmhack(callback, filter, invert, cllbckArgs) {
    function applyFilter(msgs) {
      if (!filter)
        return msgs;

      if (filter.numbers) {
        msgs = msgs.filter(function(element, index, array) {
          var num = filter.numbers;
          return (num && (num.indexOf(element.sender) != -1 ||
                          num.indexOf(element.receiver) != -1));
        });
      }

      if (!invert) {
        msgs.sort(function(a,b){
          return b.timestamp - a.timestamp;
        });
      } else {
        msgs.sort(function(a,b){
          return a.timestamp - b.timestamp;
        });
      }
      return msgs;
    }

    messagesHack.sort(function(a,b){
      return b.timestamp - a.timestamp;
    });
    var msg = messagesHack.slice();
    if (invert)
      msg.reverse();
    callback(applyFilter(msg), cllbckArgs);
  };

  MessageManager.getMessages = function(callback, filter, invert, cllbckArgs) {
    GetMessagesHack(callback, filter, invert, cllbckArgs);
    return;
  };

  MessageManager.getThreads = function(callback, extraArg) {
    threadsHack.sort(function(a,b){
      return a.timestamp - b.timestamp;
    });
    callback(threadsHack, extraArg);
    return;
  };

  MessageManager.send = function(number, text, callback) {
    var message = {
      sender: null,
      receiver: number,
      delivery: 'sent',
      body: text,
      id: messagesHack.length,
      timestamp: new Date()
    };

    var simulateFail = /fail/i.test(text);

    window.setTimeout(function sent() {
      if (simulateFail) {
        // simulate failure
        callback(null);
        return;
      }

      // simulate success
      callback(message);

      // the SMS DB is written after the callback
      window.setTimeout(function writeDB() {
        messagesHack.unshift(message);
      }, 90 * Math.random());
    }, 3000 * Math.random());

    if (simulateFail)
      return;

    window.setTimeout(function hiBack() {
      var message = {
        sender: number,
        receiver: null,
        delivery: 'received',
        body: 'Hi back! ' + text,
        id: messagesHack.length,
        timestamp: new Date()
      };

      var evt = {
        type: 'received',
        message: message
      };
      MessageManager.handleEvent.call(MessageManager, evt);
      // the SMS DB is written after the callback
      window.setTimeout(function writeDB() {
        messagesHack.unshift(message);
      }, 90 * Math.random());

    }, 5000 + 3000 * Math.random());
  };
}
