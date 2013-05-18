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
  var now = Date.now();

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
      read: true,
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
      read: true,
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
      read: true,
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
      read: true,
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
      read: true,
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
      read: true,
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
        read: true,
        type: 'sms',
        timestamp: new Date(Date.now() - 172800000)
      },
      {
        threadId: 4,
        sender: null,
        read: true,
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
        read: true,
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
        read: true,
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
        read: true,
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
        read: true,
        body: 'short (delivery: sending)',
        delivery: 'sending',
        type: 'sms',
        timestamp: new Date(Date.now() - 400000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        read: true,
        body: 'short (delivery: error)',
        delivery: 'error',
        type: 'sms',
        timestamp: new Date(Date.now() - 300000)
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        read: true,
        body: 'short (delivery: sent)',
        delivery: 'sent',
        type: 'sms',
        timestamp: new Date(Date.now() - 200000)
      },
      {
        threadId: 4,
        sender: '197746797',
        read: true,
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
        timestamp: new Date(now - (60000 * 12)),
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
        timestamp: new Date(now - (60000 * 10)),
        unreadCount: 0
      },
      {
        id: 7,
        participants: ['999', '888', '777'],
        lastMessageType: 'mms',
        timestamp: new Date(now),
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
      read: i < 147 ? true : false,
      body: 'Hello world!',
      delivery: 'received',
      id: messagesDb.id++,
      type: 'sms',
      timestamp: new Date(Date.now() - 60000000)
    });
  }

  var first = 60000 * 50; // 1 minute * 50 Minutes

  for (var i = 0; i < 50; i++) {
    var sender = ['999', '888', '777'][Math.floor(Math.random() * 3)];
    var receivers = ['999', '888', '777'].filter(function(val) {
      return val !== sender;
    });
    messagesDb.messages.push({
      threadId: 7,
      sender: sender,
      receivers: receivers,
      delivery: 'received',
      id: messagesDb.id++,
      read: true,
      type: 'mms',
      subject: '',
      smil: '<smil><body><par><text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['hi! this is ' + sender], { type: 'text/plain' })
      }],
      timestamp: new Date(now - first)
    });
    first -= 60000;
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
    // In the case of a multi-recipient message, the mock will fake a response
    // from the first recipient specified.
    var senderNumber = Array.isArray(number) ? number[0] : number;

    // TODO: Retrieve the message's thread by the thread ID.
    // See Bug 868679 - [SMS][MMS] use the threadId as the "key" of a thread
    // instead of a phone number in all places where it's relevant
    var thread = messagesDb.threads.filter(function(t) {
      return t.participants[0] === senderNumber;
    })[0];
    if (!thread) {
      thread = {
        id: messagesDb.id++,
        participants: [].concat(number),
        body: text,
        timestamp: new Date(),
        unreadCount: 0,
        lastMessageType: 'sms'
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
        receiver: senderNumber,
        delivery: 'sending',
        body: text,
        id: sendId,
        type: 'sms',
        read: true,
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
          sender: senderNumber,
          receiver: null,
          delivery: 'received',
          body: 'Hi back! ' + text,
          id: messagesDb.id++,
          type: 'sms',
          read: false,
          timestamp: new Date(),
          threadId: thread.id
        }
      };
      messagesDb.messages.push(receivedInfo.message);
      thread.unreadCount++;
      trigger('received', receivedInfo);
    };

    setTimeout(initiateSend, simulation.delay());

    return request;
  };

  function hasSameParticipants(a, b) {
    return a.every(function(p) {
      return b.indexOf(p) !== -1;
    });
  }

  MockNavigatormozMobileMessage.sendMMS = function(params) {
    /**
      params {
        receivers: [...recipients],
        subject: '',
        smil: smil string,
        attachments: ...
      }
    */

    var sendId = messagesDb.id++;
    var request = {
      error: null
    };

    var thread = messagesDb.threads.filter(function(t) {
      return hasSameParticipants(
        t.participants, params.receivers
      );
    })[0];

    // New group threads
    if (!thread) {
      thread = {
        id: messagesDb.id++,
        lastMessageType: 'mms',
        participants: params.receivers,
        body: '',
        timestamp: new Date(),
        unreadCount: 0
      };
      messagesDb.threads.push(thread);
    } else {
      thread.timestamp = new Date();
    }

    var sendInfo = {
      type: 'sent',
      message: {
        id: sendId,
        threadId: thread.id,
        sender: null,
        receivers: params.receivers,
        type: 'mms',
        delivery: 'sending',
        read: true,
        subject: '',
        smil: params.smil,
        attachments: params.attachments,
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

      params.receivers.forEach(function(sender) {
        var receivedInfo = {
          type: 'received',
          message: {
            sender: sender,
            receiver: null,
            delivery: 'received',
            id: messagesDb.id++,
            timestamp: new Date(),
            threadId: thread.id,
            type: 'mms',
            read: false,
            subject: '',
            smil: '<smil><body><par><text src="text1"/></par></body></smil>',
            attachments: [{
              location: 'text1',
              content: new Blob(
                ['Got it! (This is ' + sender + ')'],
                { type: 'text/plain' }
              )
            }]
          }
        };
        messagesDb.messages.push(receivedInfo.message);
        thread.unreadCount++;
        trigger('received', receivedInfo);
      });
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

  // getMessage
  // Parameters:
  //  - id: Number specifying the message to retrieve
  //  Returns: request object
  MockNavigatormozMobileMessage.getMessage = function(id) {
    var request = {
      error: null
    };

    setTimeout(function() {
      if (simulation.failState()) {
        request.error = {
          name: 'mock getMessage error'
        };
        if (typeof request.onerror === 'function') {
          request.onerror();
        }
        return;
      }

      request.result = messagesDb.messages.filter(function(message) {
        return message.id === id;
      })[0];

      if (typeof request.onsuccess === 'function') {
        request.onsuccess();
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
      if (filter.threadId) {
        msgs = msgs.filter(function(msg) {
          return msg.threadId === filter.threadId;
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
    var threads = messagesDb.threads;
    var msgs = messagesDb.messages;
    var isEmptyThread = false;
    var idx, len, threadId;

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

      request.result = false;

      for (idx = 0, len = msgs.length; idx < len; ++idx) {
        if (msgs[idx].id === id) {
          request.result = true;
          threadId = msgs[idx].threadId;
          msgs.splice(idx, 1);
          break;
        }
      }

      isEmptyThread = !!msgs.filter(function(msg) {
        return msg.threadId === threadId;
      }).length;

      if (isEmptyThread) {
        for (idx = 0, len = threads.length; idx < len; ++idx) {
          if (threads[idx].id === threadId) {
            threads.splice(idx, 1);
            break;
          }
        }
      }

      if (typeof request.onsuccess === 'function') {
        request.onsuccess.call(request);
      }
    }, simulation.delay());

    return request;
  };

  MockNavigatormozMobileMessage.markMessageRead = function(id, readBool) {
    var request = {
      result: true,
      error: null
    };
    // Convenience alias
    var threads = messagesDb.threads;
    var msgs = messagesDb.messages;
    var isUpdating = false;
    var idx, len, threadId;

    setTimeout(function() {
      if (simulation.failState()) {
        request.error = {
          name: 'mock markMessageRead error'
        };
        if (typeof request.onerror === 'function') {
          request.onerror();
        }
        return;
      }

      for (idx = 0, len = msgs.length; idx < len; ++idx) {
        if (msgs[idx].id === id) {
          if (msgs[idx].read !== readBool) {
            isUpdating = true;
          }
          msgs[idx].read = readBool;
          break;
        }
      }

      for (idx = 0, len = threads.length; idx < len; ++idx) {
        if (threads[idx].id === threadId) {
          // Only change the unreadCount if this is
          if (isUpdating) {
            if (readBool) {
              threads[idx].unreadCount--;
            } else {
              threads[idx].unreadCount++;
            }
          }
          break;
        }
      }

      if (typeof request.onsuccess === 'function') {
        request.onsuccess.call(request);
      }
    }, simulation.delay());

    return request;
  };

  MockNavigatormozMobileMessage.getSegmentInfoForText = function(text) {
    var length = text.length;
    var segmentLength = 160;
    var charsUsedInLastSegment = (length % segmentLength);
    var segments = Math.ceil(length / segmentLength);
    return {
      segments: segments,
      charsAvailableInLastSegment: charsUsedInLastSegment ?
        segmentLength - charsUsedInLastSegment :
        0
    };
  };

}(this));
