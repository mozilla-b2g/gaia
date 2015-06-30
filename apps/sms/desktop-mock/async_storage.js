(function(exports) {
  'use strict';

  // Fake drafts stored in local store
  const timestamp = Date.now(),
        store = new Map();

  const draftIndex = [
    [11,  [{
      recipients: ['555', '666'],
      subject: '',
      content: ['This is a draft message'],
      timestamp: timestamp - (3600000 * 24),
      threadId: 11,
      type: 'sms'
    }]],
    [null, [{
      recipients: [],
      subject: '',
      content: ['This is a draft SMS, with no recipient'],
      timestamp: timestamp,
      threadId: null,
      type: 'sms'
    }, {
      recipients: ['555-666-1234'],
      subject: '',
      content: ['This is a draft SMS, with a recipient, but no thread'],
      timestamp: timestamp - 3600000,
      threadId: null,
      type: 'sms'
    }]],
    [8, [{
      recipients: ['123456'],
      subject: '',
      content: [
        'This is a draft MMS...',
        {
          blob: {
            type: 'audio/ogg',
            size: 12345
          },
          name: 'audio.oga'
        },
        '...with a recipient and a thread'
      ],
      timestamp: timestamp - (3600000 * 2),
      threadId: 8,
      type: 'mms'
    }]]
  ];

  store.set('draft index', draftIndex);

  function callCallback(value, callback) {
    if (typeof callback === 'function') {
      setTimeout(callback.bind(null, value), 0);
    }
  }

  Object.defineProperty(exports, 'asyncStorage', {
    value: {
      getItem: function asm_getItem(key, callback) {
        callCallback(store.get(key) || null, callback);
      },
      setItem: function asm_setItem(key, value, callback) {
        callCallback(store.set(key, value), callback);
      },
      removeItem: function asm_removeItem(key, callback) {
        callCallback(store.delete(key), callback);
      },
      clear: function asm_clear(callback) {
        callCallback(store.clear(), callback);
      },
      length: function(callback) {
        callCallback(store.size, callback);
      },
      key: function() {
        throw new Error('Not Implemented');
      }
    }
  });
})(window);
