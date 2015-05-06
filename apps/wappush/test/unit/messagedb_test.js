/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global MessageDB */

'use strict';

require('/shared/js/event_dispatcher.js');

require('/js/messagedb.js');

suite('MessageDB', function() {
  var messages = {
    current: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      serviceId: 0,
      timestamp: '1',
      href: 'http://www.mozilla.org',
      id: 'gaia-test@mozilla.org',
      created: (new Date('2013-09-03T10:35:33Z')).getTime(),
      action: 'signal-medium',
      text: 'check this out'
    },
    older: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      serviceId: 0,
      timestamp: '2',
      href: 'http://www.mozilla.org',
      id: 'gaia-test@mozilla.org',
      created: (new Date('2013-09-03T10:35:32Z')).getTime(),
      action: 'signal-medium',
      text: 'older message'
    },
    newer: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      serviceId: 0,
      timestamp: '3',
      href: 'http://www.mozilla.org',
      id: 'gaia-test@mozilla.org',
      created: (new Date('2013-09-03T10:35:34Z')).getTime(),
      action: 'signal-medium',
      text: 'newer message'
    },
    delete: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      serviceId: 0,
      timestamp: '3',
      href: 'http://www.mozilla.org',
      id: 'gaia-test@mozilla.org',
      action: 'delete',
      text: ''
    },
    old_delete: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      serviceId: 0,
      timestamp: '4',
      href: 'http://www.mozilla.org',
      id: 'gaia-test@mozilla.org',
      created: (new Date('2013-09-03T10:35:32Z')).getTime(),
      action: 'delete',
      text: ''
    },
    low: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      serviceId: 0,
      timestamp: '5',
      href: 'http://www.mozilla.org',
      id: 'http://www.mozilla.org',
      action: 'signal-low',
      text: 'check this out'
    },
    medium: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      serviceId: 0,
      timestamp: '6',
      href: 'http://www.mozilla.org',
      id: 'http://www.mozilla.org',
      action: 'signal-medium',
      text: 'check this out'
    },
    high: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      serviceId: 0,
      timestamp: '7',
      href: 'http://www.mozilla.org',
      id: 'http://www.mozilla.org',
      action: 'signal-high',
      text: 'check this out'
    }
  };

  setup(function(done) {
    MessageDB.clear().then(done, done);
  });

  suite('storing and retrieving messages', function() {
    test('message is stored', function(done) {
      var results = {};

      MessageDB.put(messages.current).then(function(status) {
        results.status = status;
        return MessageDB.retrieve(messages.current.timestamp);
      }).then(function(message) {
        done(function checks() {
          assert.equal(results.status, 'new');
          assert.equal(message.type, messages.current.type);
          assert.equal(message.sender, messages.current.sender);
          assert.equal(message.serviceId, messages.current.serviceId);
          assert.equal(message.href, messages.current.href);
          assert.equal(message.text, messages.current.text);
        });
      }, done);
    });

    test('message is removed after retrieval', function(done) {
      MessageDB.put(messages.current).then(function() {
        return MessageDB.retrieve(messages.current.timestamp);
      }).then(function(message) {
        return MessageDB.retrieve(messages.current.timestamp);
      }).then(function(message) {
        done(function checks() {
          assert.isNull(message);
        });
      }, done);
    });
  });

  suite('handling multiple messages', function() {
    test('storing multiple messages with the same si-id', function(done) {
      var results = {};

      MessageDB.put(messages.low).then(function(message) {
        results.low = { stored: message, retrieved: null };
        return MessageDB.put(messages.medium);
      }).then(function(message) {
        results.medium = { stored: message, retrieved: null };
        return MessageDB.put(messages.high);
      }).then(function(message) {
        results.high = { stored: message, retrieved: null };
        return MessageDB.retrieve(messages.low.timestamp);
      }).then(function(message) {
        results.low.retrieved = message;
        return MessageDB.retrieve(messages.medium.timestamp);
      }).then(function(message) {
        results.medium.retrieved = message;
        return MessageDB.retrieve(messages.high.timestamp);
      }).then(function(message) {
        results.high.retrieved = message;

        done(function checks() {
          assert.ok(results.low.stored);
          assert.equal(results.low.retrieved.id, messages.low.id);
          assert.equal(results.low.retrieved.action, messages.low.action);
          assert.ok(results.medium.stored);
          assert.equal(results.medium.retrieved.id, messages.medium.id);
          assert.equal(results.medium.retrieved.action, messages.medium.action);
          assert.ok(results.high.stored);
          assert.equal(results.high.retrieved.id, messages.high.id);
          assert.equal(results.high.retrieved.action, messages.high.action);
        });
      }, done);
    });
  });

  suite('out-of-order message handling', function() {
    test('message is updated by newer message', function(done) {
      var results = {};

      MessageDB.put(messages.current).then(function() {
        return MessageDB.put(messages.newer);
      }).then(function(status) {
        results.status = status;
        return MessageDB.retrieve(messages.newer.timestamp);
      }).then(function(message) {
        results.timestamp = message.timestamp;
        results.text = message.text;
        return MessageDB.retrieve(messages.current.timestamp);
      }).then(function(message) {
        done(function checks() {
          assert.equal(results.status, 'updated');
          assert.equal(results.timestamp, messages.current.timestamp);
          assert.equal(results.text, messages.newer.text);
          assert.isNull(message);
        });
      }, done);
    });

    test('old message is discarded', function(done) {
      var results = {};

      MessageDB.put(messages.current).then(function() {
        return MessageDB.put(messages.older);
      }).then(function(status) {
        results.status = status;
        return MessageDB.retrieve(messages.older.timestamp);
      }).then(function(message) {
        done(function checks() {
          assert.equal(results.status, 'discarded');
          assert.isNull(message);
        });
      }, done);
    });
  });

  suite('message actions', function() {
    teardown(function() {
      MessageDB.offAll('messagedeleted');
    });

    test('delete action removes all message with same id', function(done) {
      var results = {};

      MessageDB.put(messages.current).then(function() {
        return MessageDB.put(messages.delete);
      }).then(function(status) {
        results.status = status;
        return MessageDB.retrieve(messages.current.timestamp);
      }).then(function(message) {
        done(function checks() {
          assert.equal(results.status, 'discarded');
          assert.isNull(message);
        });
      }, done);
    });

    test('delete action messages are never stored', function(done) {
      var results = {};

      MessageDB.put(messages.delete).then(function(status) {
        results.status = status;
        return MessageDB.retrieve(messages.delete.timestamp);
      }).then(function(message) {
        done(function checks() {
          assert.equal(results.status, 'discarded');
          assert.isNull(message);
        });
      }, done);
    });

    test('delete action messages dispatch a `messagedeleted\' event',
    function(done) {
      var onMessageDeletedStub = sinon.stub();

      MessageDB.on('messagedeleted', onMessageDeletedStub);
      MessageDB.put(messages.current).then(function() {
        return MessageDB.put(messages.delete);
      }).then(function() {
        sinon.assert.calledOnce(onMessageDeletedStub);
        sinon.assert.calledWith(onMessageDeletedStub, messages.current);
      }).then(done, done);
    });

    test('old delete action is ignored', function(done) {
      var results = {};

      MessageDB.put(messages.current).then(function() {
        return MessageDB.put(messages.old_delete);
      }).then(function(status) {
        results.status = status;
        return MessageDB.retrieve(messages.current.timestamp);
      }).then(function(message) {
        done(function checks() {
          assert.equal(results.status, 'discarded');
          assert.ok(message);
        });
      }, done);
    });
  });

  suite('deleting messages', function() {
    test('delete messages by timestamp', function(done) {
      var status_low = null;
      var status_medium = null;
      var status_high = null;
      var message_low = null;
      var message_medium = null;
      var message_high = null;

      MessageDB.put(messages.low).then(function(status) {
        status_low = status;
        return MessageDB.put(messages.medium);
      }).then(function(status) {
        status_medium = status;
        return MessageDB.put(messages.high);
      }).then(function(status) {
        status_high = status;
        return MessageDB.deleteByTimestamp(messages.low.timestamp);
      }).then(function() {
        return MessageDB.deleteByTimestamp(messages.medium.timestamp);
      }).then(function() {
        return MessageDB.deleteByTimestamp(messages.high.timestamp);
      }).then(function() {
        return MessageDB.retrieve(messages.low.timestamp);
      }).then(function(message) {
        message_low = message;
        return MessageDB.retrieve(messages.medium.timestamp);
      }).then(function(message) {
        message_medium = message;
        return MessageDB.retrieve(messages.high.timestamp);
      }).then(function(message) {
        message_high = message;
        done(function checks() {
          assert.equal(status_low, 'new');
          assert.equal(status_medium, 'new');
          assert.equal(status_high, 'new');
          assert.isNull(message_low);
          assert.isNull(message_medium);
          assert.isNull(message_high);
        });
      }, done);
    });

    test('a `messagedeleted\' event is dispatched', function(done) {
      var onMessageDeletedStub = sinon.stub();

      MessageDB.on('messagedeleted', onMessageDeletedStub);
      MessageDB.put(messages.current).then(function() {
        return MessageDB.deleteByTimestamp(messages.current.timestamp);
      }).then(function() {
        MessageDB.off('messagedeleted', onMessageDeletedStub);
        sinon.assert.calledOnce(onMessageDeletedStub);
        sinon.assert.calledWith(onMessageDeletedStub, messages.current);
      }).then(done, done);
    });
  });
});
