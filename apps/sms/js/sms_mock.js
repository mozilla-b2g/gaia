/* ***********************************************************

  Code below is for desktop testing!

*********************************************************** */
(function(window) {

  var MockNavigatormozSms = window.MockNavigatormozSms = {};

  // Fake in-memory message database
  var messagesDb = {
    id: 0,
    messages: [
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
    ],
    threads: [
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
  };

  // Initialize messages with unique IDs
  messagesDb.messages.forEach(function(message) {
    message.id = messagesDb.id++;
  });

  // Procedurally generate a large amount of messages for a single thread
  for (var i = 0; i < 150; i++) {
    messagesDb.messages.push({
      sender: '14886783487',
      body: 'Hello world!',
      delivery: 'received',
      id: messagesDb.id++,
      timestamp: new Date(Date.now() - 60000000)
    });
  }

  // Internal publisher/subscriber implementation
  var allHandlers = {};
  var trigger = function(eventName, eventData) {
    var handlers = allHandlers[eventName];

    if (!handlers) {
      return;
    }

    handlers.forEach(function(handler) {
      handler.call(null, eventData);
    });
  };

  // Global simulation control
  // The following global variables, if properly defined in the global scope,
  // will affect the SMS mock's simulated network effects:
  // - SMSDebugDelay: A number defining the amount of time in milliseconds to
  //   delay asynchronous operations (default: 0)
  // - SMSDebugFail: A boolean value controlling the outcome of asynchronous
  //   operations (default: false)
  var simulation = {};

  simulation.delay = function() {
    if (typeof window.SMSDebugDelay === 'number') {
      return window.SMSDebugDelay;
    } else {
      return 0;
    }
  };

  simulation.failState = function() {
    if (typeof window.SMSDebugFail === 'boolean') {
      return window.SMSDebugFail;
    } else {
      return false;
    }
  };

  // mozSms API
  MockNavigatormozSms.addEventListener = function(eventName, handler) {
    var handlers = allHandlers[eventName];
    if (!handlers) {
      handlers = allHandlers[eventName] = [];
    }
    handlers.push(handler);
  };

  MockNavigatormozSms.send = function(number, text, success, error) {
    var sendId = messagesDb.id++;
    var request = {
      error: null
    };
    var sendInfo = {
      type: 'sent',
      message: {
        sender: null,
        receiver: number,
        delivery: 'sending',
        body: text,
        id: sendId,
        timestamp: new Date()
      }
    };

    var initiateSend = function() {
      messagesDb.messages.push(sendInfo.message);
      trigger('sending', sendInfo);

      setTimeout(completeSend, simulation.delay());
    };

    var completeSend = function() {
      request.result = sendInfo;

      if (simulation.failState()) {
        sendInfo.message.delivery = 'error';
        request.error = {
          name: 'mock send error'
        };
        if (typeof request.onerror === 'function') {
          request.onerror();
        }
        trigger('failed', sendInfo);
      } else {
        sendInfo.message.delivery = 'sent';
        if (typeof request.onsuccess === 'function') {
          request.onsuccess();
        }
        trigger('sent', sendInfo);

        setTimeout(simulateResponse, simulation.delay());
      }
    };

    // Echo messages back
    var simulateResponse = function() {
      var receivedInfo = {
        type: 'received',
        message: {
          sender: number,
          receiver: null,
          delivery: 'received',
          body: 'Hi back! ' + text,
          id: messagesDb.id++,
          timestamp: new Date()
        }
      };
      messagesDb.messages.push(receivedInfo.message);
      trigger('received', receivedInfo);
    };

    setTimeout(initiateSend, simulation.delay());

    return request;
  };

  // getThreadList
  // Parameters: none
  // Returns: request object
  //  - error: Error information, if any (null otherwise)
  //  - onerror: Function that may be set by the suer. If set, will be invoked
  //    in the event of a failure
  MockNavigatormozSms.getThreadList = function() {
    var request = {
      error: null
    };
    var result;

    setTimeout(function() {
      var result;

      if (simulation.failState()) {
        request.error = {
          name: 'mock getThreadList error'
        };
        if (typeof request.onerror === 'function') {
          request.onerror();
        }
      } else {
        result = {
          target: {
            result: messagesDb.threads.slice()
          }
        };
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(null, result);
        }
      }
    }, simulation.delay());

    return request;
  };

  // getMessages
  // Parameters:
  //  - filter: object specifying any optional criteria by which to filter
  //    results
  //  - reverse: Boolean that controls message ordering
  // Returns: request object
  //  - error: Error information, if any (null otherwise)
  //  - onsuccess: Function that may be set by the user. If set, will be
  //    invoked in the event of a success
  //  - onerror: Function that may be set by the suer. If set, will be invoked
  //    in the event of a failure
  MockNavigatormozSms.getMessages = function(filter, reverse) {
    var request = {
      error: null
    };
    // Copy the messages array
    var msgs = messagesDb.messages.slice();
    var idx = 0;
    var len, cursor, continueCursor;

    if (filter) {
      if (filter.numbers) {
        msgs = msgs.filter(function(element, index, array) {
          var num = filter.numbers;
          return (num && (num.indexOf(element.sender) != -1 ||
                          num.indexOf(element.receiver) != -1));
        });
      }
    }

    // Sort according to timestamp
    if (!reverse) {
      msgs.sort(function(a, b) {
        return b.timestamp - a.timestamp;
      });
    } else {
      msgs.sort(function(a, b) {
        return a.timestamp - b.timestamp;
      });
    }

    len = msgs.length;

    var returnMessage = function() {

      if (simulation.failState()) {
        request.error = {
          name: 'mock getMessages error'
        };

        if (typeof request.onerror === 'function') {
          request.onerror();
        }
      } else {
        cursor = request.result = {};
        cursor.message = msgs[idx];
        idx += 1;
        cursor.continue = continueCursor;
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(null);
        }
      }

    };
    continueCursor = function() {
      setTimeout(returnMessage, simulation.delay());
    };

    setTimeout(returnMessage, simulation.delay());

    return request;
  };

  // delete
  // Parameters:
  //  - id: Number specifying which message to delete
  // Returns: request object
  //  - error: Error information, if any (null otherwise)
  //  - onsuccess: Function that may be set by the user. If set, will be
  //    invoked in the event of a success
  //  - onerror: Function that may be set by the suer. If set, will be invoked
  //    in the event of a failure
  MockNavigatormozSms.delete = function(id) {
    var request = {
      error: null
    };
    // Convenience alias
    var msgs = messagesDb.messages;
    var idx, len;

    setTimeout(function() {
      if (simulation.failState()) {
        request.error = {
          name: 'mock delete error'
        };
        if (typeof request.onerror === 'function') {
          request.onerror();
        }
        return;
      }

      for (idx = 0, len = msgs.length; idx < len; ++idx) {
        if (msgs[idx].id === id) {
          msgs.splice(idx, 1);
          break;
        }
      }

      if (typeof request.onsuccess === 'function') {
        request.onsuccess.call(null);
      }
    }, simulation.delay());

    return request;
  };

}(this));
