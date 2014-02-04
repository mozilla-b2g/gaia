/*global Drafts, Draft */
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
  var ONE_DAY_TIME = 24 * 60 * 60 * 1000;

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
      deliveryInfo: [{deliveryStatus: 'success'}],
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
      timestamp: now
    });
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      read: true,
      delivery: 'sent',
      deliveryInfo: [{deliveryStatus: 'success'}],
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
      timestamp: now
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
      deliveryInfo: [{deliveryStatus: 'success'}],
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
      timestamp: now
    });
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      read: true,
      delivery: 'sent',
      deliveryInfo: [{deliveryStatus: 'success'}],
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
      timestamp: now
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
      deliveryInfo: [{deliveryStatus: 'success'}],
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
      timestamp: now
    });
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      read: true,
      type: 'mms',
      delivery: 'sent',
      deliveryInfo: [{deliveryStatus: 'success'}],
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
      timestamp: now
    });
  });

  getTestFile('/test/unit/media/kitten-45.bmp', function(testImageBlob) {
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      read: true,
      delivery: 'received',
      deliveryInfo: [{deliveryStatus: 'success'}],
      subject: 'Test MMS bmp format Image message',
      smil: '<smil><body><par><img src="example.bmp"/>' +
            '<text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['This is a bmp image message'],
            { type: 'text/plain' })
      },{
        location: 'example.bmp',
        content: testImageBlob
      }],
      timestamp: now
    });
  });

  getTestFile('/test/unit/media/grid.wbmp', function(testImageBlob) {
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      read: true,
      delivery: 'received',
      deliveryInfo: [{deliveryStatus: 'success'}],
      subject: 'Test MMS wbmp format Image message',
      smil: '<smil><body><par><img src="grid.wbmp"/>' +
            '<text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['This is a wbmp image message'],
            { type: 'text/plain' })
      },{
        location: 'grid.wbmp',
        content: testImageBlob
      }],
      timestamp: now
    });
  });

  getTestFile('/test/unit/media/contact.vcf', function(contactBlob) {
    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      read: true,
      delivery: 'received',
      deliveryInfo: [{deliveryStatus: 'success'}],
      subject: 'Test vard without text content',
      smil: '<smil><body><par><ref src="contact.vcf"/>' +
            '</par></body></smil>',
      attachments: [{
        location: 'contact.vcf',
        content: contactBlob
      }],
      timestamp: now
    });

    messagesDb.messages.push({
      id: messagesDb.id++,
      threadId: 6,
      sender: '052780',
      type: 'mms',
      read: true,
      delivery: 'received',
      deliveryInfo: [{deliveryStatus: 'success'}],
      subject: 'Test vard with text content',
      smil: '<smil><body><par><ref src="contact.vcf"/>' +
            '<text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['This is a vcard'],
            { type: 'text/plain' })
      },{
        location: 'contact.vcf',
        content: contactBlob
      }],
      timestamp: now
    });
  });

  var participants = [
    '101', '102', '103', '104', '105', '106', '107', '108', '109'
  ];

  // Fake drafts stored in local store
  (function() {
    var d1, d2, d3, d4, d5;
    d1 = new Draft({
      recipients: ['555', '666'],
      content: 'This is a draft message',
      timestamp: 1,
      threadId: 42,
      type: 'sms'
    });
    d2 = new Draft({
      recipients: ['555'],
      content: 'This is a draft message',
      timestamp: 2,
      threadId: 42,
      type: 'sms'
    });
    d3 = new Draft({
      recipients: ['555', '222'],
      content: 'This is a draft message',
      timestamp: 3,
      threadId: 1,
      type: 'sms'
    });
    d4 = new Draft({
      recipients: ['555', '333'],
      content: 'This is a draft message',
      timestamp: 4,
      threadId: 2,
      type: 'sms'
    });
    d5 = new Draft({
      recipients: ['555', '444'],
      content: 'This is a draft message',
      timestamp: 5,
      threadId: null,
      type: 'sms'
    });
    Drafts.clear();
    Drafts.add(d1);
    Drafts.add(d2);
    Drafts.add(d3);
    Drafts.add(d4);
    Drafts.add(d5);
    Drafts.store();
  }());


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
        timestamp: now,
        deliveryStatus: 'success'
      },
      {
        threadId: 1,
        sender: null,
        receiver: '1977',
        body: 'arr :)',
        delivery: 'sent',
        read: true,
        type: 'sms',
        deliveryStatus: 'not-applicable',
        timestamp: now - 8400000000
      },
      {
        threadId: 2,
        sender: null,
        receiver: '436797',
        body: 'Sending :)',
        delivery: 'sending',
        read: true,
        type: 'sms',
        deliveryStatus: 'not-applicable',
        timestamp: now - 172800000
      },
      {
        threadId: 3,
        sender: '+18001114321',
        body: 'I have a really long name!',
        read: true,
        type: 'sms',
        deliveryStatus: 'not-applicable',
        delivery: 'sent',
        timestamp: now
      },
      {
        threadId: 3,
        sender: null,
        receiver: '+18001114321',
        read: true,
        type: 'mms',
        deliveryInfo: [{deliveryStatus: 'not-applicable'}],
        delivery: 'sent',
        timestamp: now,
        subject: 'subject only message',
        attachments: []
      },
      {
        threadId: 3,
        sender: '+18001114321',
        read: true,
        type: 'mms',
        deliveryInfo: [{deliveryStatus: 'not-applicable'}],
        delivery: 'received',
        timestamp: now,
        subject: '',
        attachments: []
      },
      {
        threadId: 4,
        sender: null,
        read: true,
        receiver: '197746797',
        body: 'This message is intended to demonstrate hyperlink creation: ' +
        'http://mozilla.org or https://bugzilla.mozilla.org:8080' +
        ' or\ngoogle.com or www.google.es',
        error: true,
        type: 'sms',
        deliveryStatus: 'not-applicable',
        timestamp: now - 900000
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
        deliveryStatus: 'pending',
        timestamp: now - 800000
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
        deliveryStatus: 'error',
        timestamp: now - 700000
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'This message is intended to demonstrate natural line ' +
          'wrapping. (delivery: sent)',
        delivery: 'sent',
        type: 'sms',
        deliveryStatus: 'not-applicable',
        timestamp: now - 600000
       },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        body: 'This message is intended to demonstrate natural line ' +
          'wrapping. (delivery: sent ; deliveryStatus: success)',
        delivery: 'sent',
        deliveryStatus: 'success',
        type: 'sms',
        timestamp: now - 550000
       },
       {
        threadId: 4,
        sender: '197746797',
        read: true,
        body: 'This message is intended to demonstrate natural line ' +
          'wrapping. (delivery: received)',
        delivery: 'received',
        deliveryStatus: 'success',
        type: 'sms',
        timestamp: now - 500000
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        read: true,
        body: 'short (delivery: sending)',
        delivery: 'sending',
        type: 'sms',
        deliveryStatus: 'not-applicable',
        timestamp: now - 400000
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        read: true,
        body: 'short (delivery: error)',
        delivery: 'error',
        type: 'sms',
        deliveryStatus: 'error',
        timestamp: now - 300000
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        read: true,
        body: 'short (delivery: sent)',
        delivery: 'sent',
        type: 'sms',
        deliveryStatus: 'success',
        timestamp: now - 200000
      },
      {
        threadId: 4,
        sender: null,
        receiver: '197746797',
        read: true,
        body: 'short (delivery success)',
        delivery: 'sent',
        deliveryStatus: 'success',
        type: 'sms',
        timestamp: now - 150000
      },
      {
        threadId: 4,
        sender: '197746797',
        read: true,
        body: 'short (delivery: received)',
        delivery: 'received',
        type: 'sms',
        deliveryStatus: 'success',
        timestamp: now - 100000
      },
      {
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'pending'}],
        subject: 'Pending download',
        timestamp: now - 150000,
        expiryDate: now + ONE_DAY_TIME
      },
      {
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
        subject: 'Error download',
        timestamp: now - 150000,
        expiryDate: now + ONE_DAY_TIME * 2
      },
      {
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
        subject: 'Error download',
        timestamp: now - 150000,
        expiryDate: now - ONE_DAY_TIME
      },
      {
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'received',
        deliveryInfo: [{receiver: null, deliveryStatus: 'success'}],
        subject: 'No attachment error',
        smil: '<smil><body><par><text src="text1"/></par></body></smil>',
        attachments: null,
        timestamp: now - 150000,
        expiryDate: now + ONE_DAY_TIME
      },
      {
        threadId: 10,
        sender: '+12125551234',
        read: true,
        body: '<html>',
        delivery: 'received',
        type: 'sms',
        timestamp: +now
      }
    ],
    threads: [
      {
        id: 1,
        participants: ['1977'],
        lastMessageType: 'sms',
        body: 'Alo, how are you today, my friend? :)',
        timestamp: now - 172800000,
        unreadCount: 0
      },
      {
        id: 2,
        participants: ['436797'],
        lastMessageType: 'sms',
        body: 'Sending :)',
        timestamp: now - 172800000,
        unreadCount: 0
      },
      {
        id: 3,
        participants: ['+18001114321'],
        lastMessageType: 'sms',
        body: 'I have a very long name!',
        timestamp: now,
        unreadCount: 0
      },
      {
        id: 4,
        participants: ['197746797'],
        body: 'short (delivery: received)',
        timestamp: now - 172800000,
        lastMessageType: 'sms',
        unreadCount: 0
      },
      {
        id: 5,
        participants: ['14886783487'],
        lastMessageType: 'sms',
        body: 'Hello world!',
        timestamp: now - 600000000,
        unreadCount: 2
      },
      {
        id: 6,
        participants: ['052780'],
        lastMessageType: 'mms',
        timestamp: now - (60000000 * 10),
        unreadCount: 0
      },
      {
        id: 7,
        participants: ['999', '888', '777', '123456'],
        lastMessageType: 'mms',
        timestamp: +now,
        unreadCount: 0
      },
      {
        id: 8,
        participants: ['123456'],
        lastMessageType: 'mms',
        timestamp: now - 150000000,
        unreadCount: 0
      },
      {
        id: 9,
        participants: participants,
        lastMessageType: 'mms',
        timestamp: now - 150000000,
        unreadCount: 0
      },
      {
        id: 10,
        participants: ['+12125551234', '+15551237890'],
        lastMessageType: 'mms',
        timestamp: now,
        unreadCount: 0
      }
    ]
  };

  // Initialize messages with unique IDs
  messagesDb.messages.forEach(function(message) {
    message.id = messagesDb.id++;
  });

  var i, sender, receivers;

  // Procedurally generate a large amount of messages for a single thread
  for (i = 0; i < 150; i++) {
    messagesDb.messages.push({
      threadId: 5,
      sender: '14886783487',
      read: i < 147 ? true : false,
      body: 'Hello world!',
      delivery: 'received',
      id: messagesDb.id++,
      type: 'sms',
      timestamp: now - 60000000
    });
  }

  var first = 60000 * 50; // 1 minute * 50 Minutes

  /* jshint loopfunc: true */
  for (i = 0; i < 50; i++) {
    sender = ['999', '888', '777'][Math.floor(Math.random() * 3)];
    receivers = ['999', '888', '777'].filter(function(val) {
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
      deliveryInfo: [{deliveryStatus: 'success'}],
      subject: '',
      smil: '<smil><body><par><text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['hi! this is ' + sender], { type: 'text/plain' })
      }],
      timestamp: now - first
    });
    first -= 60000;
  }

  first = 60000 * 40; // 1 minute * 50 Minutes

  for (i = 0; i < 40; i++) {
    sender = participants[Math.floor(Math.random() * 9)];
    receivers = participants.filter(function(val) {
      return val !== sender;
    });
    messagesDb.messages.push({
      threadId: 9,
      sender: sender,
      receivers: receivers,
      delivery: 'received',
      id: messagesDb.id++,
      read: true,
      type: 'mms',
      deliveryInfo: [{deliveryStatus: 'success'}],
      subject: '',
      smil: '<smil><body><par><text src="text1"/></par></body></smil>',
      attachments: [{
        location: 'text1',
        content: new Blob(['hi! this is ' + sender], { type: 'text/plain' })
      }],
      timestamp: now - first
    });
    first -= 60000;
  }


  messagesDb.messages.push({
    threadId: 10,
    receivers: ['+12125551234', '+15551237890'],
    delivery: 'received',
    id: messagesDb.id++,
    read: true,
    type: 'mms',
    deliveryInfo: [{deliveryStatus: 'success'}],
    subject: '',
    smil: '<smil><body><par><text src="text1"/></par></body></smil>',
    attachments: [{
      location: 'text1',
      content: new Blob(
        ['one contact with two numbers.\n\n ' +
         'This matches a contact:  +12125551234\n\n' +
         'This does not:  +14327659801\n\n' +
         'A URL:  http://mozilla.com\n\n' +
         'An email address:  a@b.com'],
         { type: 'text/plain' }
      )
    }],
    timestamp: now
  });


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
  // - MessagesDebugError: A string value controlling the error name returned
  //   from asynchronus operatrions (default: null)
  var simulation = {};

  simulation.delay = function() {
    if (typeof window.SMSDebugDelay === 'number') {
      return window.SMSDebugDelay;
    } else {
      return 0;
    }
  };

  simulation.failState = function() {
    return typeof window.MessagesDebugError === 'string';
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
        timestamp: now,
        unreadCount: 0,
        lastMessageType: 'sms'
      };
      messagesDb.threads.push(thread);
    }
    else {
      thread.body = text;
      thread.timestamp = now;
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
        timestamp: now,
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
          name: window.MessagesDebugError
        };
        if (typeof request.onerror === 'function') {
          request.onerror({
            target: {
              error: request.error
            }
          });
        }
        trigger('failed', sendInfo);
      } else {
        sendInfo.message.delivery = 'sent';
        if (typeof request.onsuccess === 'function') {
          request.onsuccess({
            target: {
              result: request
            }
          });
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
          timestamp: now,
          threadId: thread.id
        }
      };
      messagesDb.messages.push(receivedInfo.message);
      thread.unreadCount++;
      trigger('received', receivedInfo);
    };

    setTimeout(initiateSend, simulation.delay());

    return [request];
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
        timestamp: now,
        unreadCount: 0
      };
      messagesDb.threads.push(thread);
    } else {
      thread.timestamp = now;
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
        deliveryInfo: [{deliveryStatus: 'not-applicable'}],
        read: true,
        subject: '',
        smil: params.smil,
        attachments: params.attachments,
        timestamp: now
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
          name: window.MessagesDebugError
        };
        if (typeof request.onerror === 'function') {
          request.onerror({
            target: {
              error: request.error
            }
          });
        }
        trigger('failed', sendInfo);
      } else {
        sendInfo.message.delivery = 'sent';
        if (typeof request.onsuccess === 'function') {
          request.onsuccess({
            target: {
              result: request
            }
          });
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
            timestamp: now,
            threadId: thread.id,
            type: 'mms',
            deliveryInfo: [{deliveryStatus: 'success'}],
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

    return [request];
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
        request.error = { name: window.MessagesDebugError };
        if (typeof request.onerror === 'function') {
          request.onerror({
            target: {
              error: request.error
            }
          });
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
        request.error = { name: window.MessagesDebugError };
        if (typeof request.onerror === 'function') {
          request.onerror({
            target: {
              error: request.error
            }
          });
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
        request.error = { name: window.MessagesDebugError };
        if (typeof request.onerror === 'function') {
          request.onerror({
            target: {
              error: request.error
            }
          });
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
          name: window.MessagesDebugError
        };
        if (typeof request.onerror === 'function') {
          request.onerror({
            target: {
              error: request.error
            }
          });
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
          name: window.MessagesDebugError
        };
        if (typeof request.onerror === 'function') {
          request.onerror({
            target: {
              error: request.error
            }
          });
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

  MockNavigatormozMobileMessage.retrieveMMS = function(id) {
    var request = {
      error: null
    };
    var msgs = messagesDb.messages;
    var idx = 0, len = msgs.length;
    setTimeout(function() {
      var msg;
      for (; idx < len; ++idx) {
        msg = msgs[idx];
        if (msg.type !== 'mms' || msg.delivery !== 'not-downloaded' ||
          +msg.expiryDate < now) {
          continue;
        }
        if (msg.id === id) {
          request.result = msg;
          msg.smil = '<smil><body><par><text src="text1"/></par>' +
            '</body></smil>';
          msg.attachments = [{
            location: 'text1',
            content: new Blob(['You retrieve me'], { type: 'text/plain' })
          }];
          msg.delivery = 'received';

          if (typeof request.onsuccess === 'function') {
            request.onsuccess.call(request);
          }
          trigger('received', {
            type: 'received',
            message: msg
          });
          return;
        }
      }
      if (typeof request.onerror === 'function') {
        request.onerror.call(request);
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

}(window));
