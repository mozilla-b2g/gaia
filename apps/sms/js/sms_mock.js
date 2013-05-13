/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* ***********************************************************

  Code below is for desktop testing!

*********************************************************** */
(function(window) {

  var MockNavigatormozMobileMessage =
        window.DesktopMockNavigatormozMobileMessage = {};

  var outstandingRequests = 0;
  var requests = {};

  function getTestFile(filename, callback) {
    if (!requests[filename]) {
      requests[filename] = [];
      var req = new XMLHttpRequest();
      req.open('GET', filename, true);
      req.responseType = 'blob';
      req.onload = function() {
        requests[filename].forEach(function(callback) {
          callback(req.response);
          requests[filename].data = req.response;
        });
        // we called em, no need to store anymore
        requests[filename].length = 0;
        if (--outstandingRequests === 0) {
          doneCallbacks.forEach(function(callback) {
            callback();
          });
          doneCallbacks.length = 0;
        }
      };
      requests[filename].push(callback);
      outstandingRequests++;
      req.send();
    } else {
      if (requests[filename].data) {
        callback(requests[filename].data);
      } else {
        requests[filename].push(callback);
      }
    }
  }

  var doneCallbacks = [];
  MockNavigatormozMobileMessage._doneLoadingData = function(callback) {
    if (!outstandingRequests) {
      callback();
    } else {
      doneCallbacks.push(callback);
    }
  };

  getTestFile('/test/unit/media/kitten-450.jpg', function(testImageBlob) {
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      delivery: 'received',
      subject: 'Test MMS Image message',
      smil: '<smil><body><par><img src="example.jpg"/>' +
            '<text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['This is an image message'], { type: 'text/plain' })
      },{
        location: 'example.jpg',
        content: testImageBlob
      }],
      timestamp: new Date()
    });
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      delivery: 'sent',
      subject: 'Test MMS Image message',
      smil: '<smil><body><par><text src="text1"/></par>' +
            '<par><img src="example.jpg"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['sent image message'], { type: 'text/plain' })
      },{
        location: 'example.jpg',
        content: testImageBlob
      }],
      timestamp: new Date()
    });
  });

  getTestFile('/test/unit/media/video.ogv', function(testVideoBlob) {
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      delivery: 'received',
      subject: 'Test MMS Video message',
      smil: '<smil><body><par><video src="example.ogv"/>' +
            '<text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['This is a video message'], { type: 'text/plain' })
      },{
        location: 'example.ogv',
        content: testVideoBlob
      }],
      timestamp: new Date()
    });
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      delivery: 'sent',
      subject: 'Test MMS Video message',
      smil: '<smil><body><par><text src="text1"/></par>' +
            '<par><video src="example.ogv"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['sent video message'], { type: 'text/plain' })
      },{
        location: 'example.ogv',
        content: testVideoBlob
      }],
      timestamp: new Date()
    });
  });
  getTestFile('/test/unit/media/audio.oga', function(testAudioBlob) {
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      delivery: 'received',
      subject: 'Test MMS audio message',
      smil: '<smil><body><par><audio src="example.ogg"/>' +
            '<text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['This is an audio message'], { type: 'text/plain' })
      },{
        location: 'example.ogg',
        content: testAudioBlob
      }],
      timestamp: new Date()
    });
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      delivery: 'sent',
      subject: 'Test MMS audio message',
      smil: '<smil><body><par><text src="text1"/></par>' +
            '<par><audio src="example.ogg"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['sent audio message'], { type: 'text/plain' })
      },{
        location: 'example.ogg',
        content: testAudioBlob
      }],
      timestamp: new Date()
    });
  });

  // Fake in-memory message database
  var messagesDb = {
    id: 0,
    messages: [
      {
        threadId: 1,
        sender: null,
        receiver: '1977',
        body: 'Alo, how are you today, my friend? :)',
        delivery: 'sent',
        read: true,
        type: 'sms',
        timestamp: new Date(Date.now())
      },
      {
        threadId: 1,
        sender: null,
        receiver: '1977',
        body: 'arr :)',
        delivery: 'sent',
        read: true,
        type: 'sms',
        timestamp: new Date(Date.now() - 8400000000)
      },
      {
        threadId: 2,
        sender: null,
        receiver: '436797',
        body: 'Sending :)',
        delivery: 'sending',
        type: 'sms',
        timestamp: new Date(Date.now() - 172800000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'This message is intended to demonstrate hyperlink creation: ' +
          'http://mozilla.org and https://bugzilla.mozilla.org/',
        error: true,
        type: 'sms',
        timestamp: new Date(Date.now() - 900000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'This message is intended to demonstrate natural line ' +
          'wrapping. (delivery: sending)',
        delivery: 'sending',
        type: 'sms',
        timestamp: new Date(Date.now() - 800000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'This message is intended to demonstrate natural line ' +
          'wrapping. (delivery: error)',
        delivery: 'error',
        type: 'sms',
        timestamp: new Date(Date.now() - 700000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'This message is intended to demonstrate natural line ' +
          'wrapping. (delivery: sent)',
        delivery: 'sent',
        type: 'sms',
        timestamp: new Date(Date.now() - 600000)
       },
       {
        threadId: 4,
        sender: '197746797',
        body: 'This message is intended to demonstrate natural line ' +
          'wrapping. (delivery: received)',
        delivery: 'received',
        type: 'sms',
        timestamp: new Date(Date.now() - 500000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'short (delivery: sending)',
        delivery: 'sending',
        type: 'sms',
        timestamp: new Date(Date.now() - 400000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'short (delivery: error)',
        delivery: 'error',
        type: 'sms',
        timestamp: new Date(Date.now() - 300000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'short (delivery: sent)',
        delivery: 'sent',
        type: 'sms',
        timestamp: new Date(Date.now() - 200000)
      },
      {
        threadId: 4,
        sender: '197746797',
        body: 'short (delivery: received)',
        delivery: 'received',
        type: 'sms',
        timestamp: new Date(Date.now() - 100000)
      }
    ],
    threads: [
      {
        id: 1,
        participants: ['1977'],
        lastMessageType: 'sms',
        body: 'Alo, how are you today, my friend? :)',
        timestamp: new Date(Date.now()),
        unreadCount: 0
      },
      {
        id: 2,
        participants: ['436797'],
        lastMessageType: 'sms',
        body: 'Sending :)',
        timestamp: new Date(Date.now() - 172800000),
        unreadCount: 0
      },
      {
        id: 4,
        participants: ['197746797'],
        body: 'short (delivery: received)',
        timestamp: new Date(Date.now() - 100000),
        lastMessageType: 'sms',
        unreadCount: 0
      },
      {
        id: 5,
        participants: ['14886783487'],
        lastMessageType: 'sms',
        body: 'Hello world!',
        timestamp: new Date(Date.now() - 60000000),
        unreadCount: 2
      },
      {
        id: 6,
        participants: ['052780'],
        lastMessageType: 'mms',
        timestamp: new Date(),
        unreadCount: 0
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
      threadId: 5,
      sender: '14886783487',
      body: 'Hello world!',
      delivery: 'received',
      id: messagesDb.id++,
      type: 'sms',
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

  MockNavigatormozMobileMessage.addEventListener =
    function(eventName, handler) {

    var handlers = allHandlers[eventName];
    if (!handlers) {
      handlers = allHandlers[eventName] = [];
    }
    handlers.push(handler);
  };

  MockNavigatormozMobileMessage.send = function(number, text, success, error) {
    var sendId = messagesDb.id++;
    var request = {
      error: null
    };

    var thread = messagesDb.threads.filter(function(t) {
      return t.participants[0] === number;
    })[0];
    if (!thread) {
      thread = {
        id: messagesDb.id++,
        participants: [number],
        body: text,
        timestamp: new Date(),
        unreadCount: 0
      };
      messagesDb.threads.push(thread);
    }
    else {
      thread.body = text;
      thread.timestamp = new Date();
    }

    var sendInfo = {
      type: 'sent',
      message: {
        sender: null,
        receiver: number,
        delivery: 'sending',
        body: text,
        id: sendId,
        timestamp: new Date(),
        threadId: thread.id
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
          timestamp: new Date(),
          threadId: thread.id
        }
      };
      messagesDb.messages.push(receivedInfo.message);
      trigger('received', receivedInfo);
    };

    setTimeout(initiateSend, simulation.delay());

    return request;
  };

  // getThreads
  // Parameters: none
  // Returns: request object
  //  - error: Error information, if any (null otherwise)
  //  - onerror: Function that may be set by the suer. If set, will be invoked
  //    in the event of a failure
  MockNavigatormozMobileMessage.getThreads = function() {
    var request = {
      error: null
    };
    var threads = messagesDb.threads.slice();
    var idx = 0;
    var len, continueCursor;

    len = threads.length;

    var returnThread = function() {

      if (simulation.failState()) {
        request.error = {
          name: 'mock getThreads error'
        };

        if (typeof request.onerror === 'function') {
          request.onerror();
        }
      } else {
        request.result = threads[idx];
        idx += 1;
        request.continue = continueCursor;
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(request);
        }
      }

    };
    continueCursor = function() {
      setTimeout(returnThread, simulation.delay());
    };

    continueCursor();

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
  MockNavigatormozMobileMessage.getMessages = function(filter, reverse) {
    var request = {
      error: null
    };
    // Copy the messages array
    var msgs = messagesDb.messages.slice();
    var idx = 0;
    var len, continueCursor;

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
        request.result = msgs[idx];
        request.done = !request.result;
        idx += 1;
        request.continue = continueCursor;
        if (typeof request.onsuccess === 'function') {
          request.onsuccess.call(request);
        }
      }

    };
    continueCursor = function() {
      setTimeout(returnMessage, simulation.delay());
    };

    continueCursor();

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
  MockNavigatormozMobileMessage.delete = function(id) {
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
        request.onsuccess.call(request);
      }
    }, simulation.delay());

    return request;
  };

}(this));
