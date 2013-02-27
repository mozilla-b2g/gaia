/* ***********************************************************

  Code below is for desktop testing!

*********************************************************** */
if (!navigator.mozSms) {

  // We made up a fake database on
  var messagesHack = [], threadsHack = [], messageId = 0;
  (function() {
    var messages = [
      {
        sender: null,
        receiver: '1977',
        body: 'Alo, how are you today, my friend? :)',
        delivery: 'sent',
        read: true,
        timestamp: new Date(Date.now())
      },
      {
        sender: null,
        receiver: '1977',
        body: 'arr :)',
        delivery: 'sent',
        read: true,
        timestamp: new Date(Date.now() - 8400000000)
      },
      {
        sender: null,
        receiver: '436797',
        body: 'Sending :)',
        delivery: 'sending',
        timestamp: new Date(Date.now() - 172800000)
      },
      {
        sender: null,
        receiver: '197743697',
        body: 'Nothing :)',
        delivery: 'sent',
        timestamp: new Date(Date.now() - 652800000)
      },
      {
        sender: null,
        receiver: '197746797',
        body: 'Error message:)',
        delivery: 'sending',
        error: true,
        timestamp: new Date(Date.now() - 822800000)
      },
      {
        sender: null,
        receiver: '197746797',
        body: 'Nothing :)',
        delivery: 'sent',
        timestamp: new Date(Date.now() - 1002800000)
      },
      {
        sender: null,
        receiver: '197746797',
        body: 'Nothing :)',
        delivery: 'error',
        timestamp: new Date(Date.now() - 1002800000)
      },
      {
        sender: '197746797',
        body: 'Recibido!',
        delivery: 'received',
        timestamp: new Date(Date.now() - 50000000)
      }
    ];
    messages.forEach(function(message) {
      message.id = messageId++;
    });

    for (var i = 0; i < 150; i++) {
      messages.push({
        sender: '14886783487',
        body: 'Hello world!',
        delivery: 'received',
        id: messageId++,
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
    ];
  })();

  var GetMessagesHack = function gmhack(stepCB, filter, invert, endCB, cllbckArgs) {
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
        msgs.sort(function(a, b) {
          return b.timestamp - a.timestamp;
        });
      } else {
        msgs.sort(function(a, b) {
          return a.timestamp - b.timestamp;
        });
      }
      return msgs;
    }

    messagesHack.sort(function(a, b) {
      return b.timestamp - a.timestamp;
    });
    var msg = messagesHack.slice();
    if (invert) 
      msg.reverse();
    var messagesToRender = applyFilter(msg);
    for (var i = 0, l = messagesToRender.length; i < l; i++) {
      if (stepCB) {
        stepCB(messagesToRender[i]);
      }
    }
    if (endCB) {
      endCB(cllbckArgs);
    }
  };

  MessageManager.getMessages = function(options) {
    var stepCB = options.stepCB, // CB which manage every message
        filter = options.filter, // mozMessageFilter
        invert = options.invert, // invert selection
        endCB = options.endCB,   // CB when all messages retrieved
        endCBArgs = options.endCBArgs; //Args for endCB

    GetMessagesHack(stepCB, filter, invert, endCB, endCBArgs);
  };
  

  MessageManager.getThreads = function(callback, extraArg) {
    threadsHack.sort(function(a, b) {
      return a.timestamp - b.timestamp;
    });

    if (typeof callback === "function") {
      callback(threadsHack, extraArg);
    }
  };

  MessageManager.send = function(number, text, success, failure) {
    var sent = {
      type: 'sent',
      message: {
        sender: null,
        receiver: number,
        delivery: 'sending',
        body: text,
        id: messageId++,
        timestamp: new Date()
      }
    };

    var simulateFail = /fail/i.test(text);

    MessageManager.onMessageSending(sent);
    window.setTimeout(function() {
      if (simulateFail) {
        // simulate failure
        MessageManager.onMessageFailed(sent);
        if (typeof failure === "function") {
          failure(number);
        }
        return;
      }

      // simulate success
      sent.message.delivery = 'sent';
      MessageManager.onMessageSent(sent);

      if (typeof success === "function") {
        success(sent.message);
      }

      window.setTimeout(function writeDB() {
        messagesHack.unshift(sent.message);
      }, 90 * Math.random());

    // Wait between [1000, 2000] milliseconds to simulate network latency.
    }, 1000 + 1000 * Math.random());

    if (simulateFail)
      return;

    window.setTimeout(function hiBack() {
      var received = {
        type: 'received',
        message: {
          sender: number,
          receiver: null,
          delivery: 'received',
          body: 'Hi back! ' + text,
          id: messageId++,
          timestamp: new Date()
        }
      };

      window.setTimeout(function writeDB() {
        MessageManager.onMessageReceived(received);
        messagesHack.unshift(received.message);
      }, 90 * Math.random());

    // Wait between [1000, 2000] milliseconds to simulate peer response delay.
    }, 2000 + 1000 * Math.random());
  };
}
