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
    },
    sl: {
      type: 'text/vnd.wap.sl',
      sender: '+31641600986',
      serviceId: 0,
      timestamp: '8',
      href: 'http://www.mozilla.org'
    }
  };

  setup(function(done) {
    MessageDB.clear().then(done, done);
  });

  teardown(function() {
    MessageDB.offAll();
  });

  suite('storing and retrieving messages', function() {
    var onNewStub;

    setup(function() {
      MessageDB.on('new', onNewStub = this.sinon.stub());
    });

    test('message is stored', function(done) {
      MessageDB.put(messages.current).then(function() {
        return MessageDB.retrieve(messages.current.timestamp);
      }).then(function(message) {
        sinon.assert.calledOnce(onNewStub);
        sinon.assert.calledWith(onNewStub, message);
        assert.equal(message.type, messages.current.type);
        assert.equal(message.sender, messages.current.sender);
        assert.equal(message.serviceId, messages.current.serviceId);
        assert.equal(message.href, messages.current.href);
        assert.equal(message.text, messages.current.text);
      }).then(done, done);
    });

    test('non-SI message is stored', function(done) {
      MessageDB.put(messages.sl).then(function() {
        return MessageDB.retrieve(messages.sl.timestamp);
      }).then(function(message) {
        sinon.assert.calledOnce(onNewStub);
        sinon.assert.calledWith(onNewStub, message);
        assert.equal(message.type, messages.sl.type);
        assert.equal(message.sender, messages.sl.sender);
        assert.equal(message.serviceId, messages.sl.serviceId);
        assert.equal(message.href, messages.sl.href);
      }).then(done, done);
    });
  });

  suite('handling multiple messages', function() {
    var onNewStub;

    setup(function() {
      MessageDB.on('new', onNewStub = this.sinon.stub());
    });

    test('storing multiple messages with the same si-id', function(done) {
      var results = {};

      MessageDB.put(messages.low).then(function(message) {
        return MessageDB.put(messages.medium);
      }).then(function(message) {
        return MessageDB.put(messages.high);
      }).then(function(message) {
        return MessageDB.retrieve(messages.low.timestamp);
      }).then(function(message) {
        results.low = message;
        return MessageDB.retrieve(messages.medium.timestamp);
      }).then(function(message) {
        results.medium = message;
        return MessageDB.retrieve(messages.high.timestamp);
      }).then(function(message) {
        results.high = message;

        sinon.assert.calledThrice(onNewStub);
        assert.equal(onNewStub.args[0][0], messages.low);
        assert.equal(results.low.id, messages.low.id);
        assert.equal(results.low.action, messages.low.action);
        assert.equal(onNewStub.args[1][0], messages.medium);
        assert.equal(results.medium.id, messages.medium.id);
        assert.equal(results.medium.action, messages.medium.action);
        assert.equal(onNewStub.args[2][0], messages.high);
        assert.equal(results.high.id, messages.high.id);
        assert.equal(results.high.action, messages.high.action);
      }).then(done, done);
    });
  });

  suite('out-of-order message handling', function() {
    var onNewStub;
    var onDiscardedStub;
    var onUpdatedStub;

    setup(function() {
      MessageDB.on('new', onNewStub = this.sinon.stub());
      MessageDB.on('update', onUpdatedStub = this.sinon.stub());
      MessageDB.on('discard', onDiscardedStub = this.sinon.stub());
    });

    test('message is updated by newer message', function(done) {
      var results = {};

      MessageDB.put(messages.current).then(function() {
        sinon.assert.calledOnce(onNewStub);
        sinon.assert.calledWith(onNewStub, messages.current);
        return MessageDB.put(messages.newer);
      }).then(function() {
        sinon.assert.calledOnce(onUpdatedStub);
        sinon.assert.calledWith(onUpdatedStub, messages.newer);
        return MessageDB.retrieve(messages.newer.timestamp);
      }).then(function(message) {
        results.timestamp = message.timestamp;
        results.text = message.text;
        assert.equal(results.timestamp, messages.current.timestamp);
        assert.equal(results.text, messages.newer.text);
      }).then(done, done);
    });

    test('old message is discarded', function(done) {
      MessageDB.put(messages.current).then(function() {
        sinon.assert.calledOnce(onNewStub);
        sinon.assert.calledWith(onNewStub, messages.current);
        return MessageDB.put(messages.older);
      }).then(function() {
        sinon.assert.calledOnce(onDiscardedStub);
        sinon.assert.calledWith(onDiscardedStub, messages.older);
        return MessageDB.retrieve(messages.older.timestamp);
      }).then(function() {
        assert(false, 'The promise should be rejected');
      }, function() {}).then(done, done);
    });
  });

  suite('message actions', function() {
    var onDeletedStub;
    var onDiscardedStub;

    setup(function() {
      MessageDB.on('delete', onDeletedStub = this.sinon.stub());
      MessageDB.on('discard', onDiscardedStub = this.sinon.stub());
    });

    test('delete action removes all message with same id', function(done) {
      MessageDB.put(messages.current).then(function() {
        return MessageDB.put(messages.delete);
      }).then(function() {
        return MessageDB.retrieve(messages.current.timestamp);
      }).then(function() {
        assert(false, 'The promise should be rejected');
      }, function() {}).then(done, done);
    });

    test('delete action messages are never stored', function(done) {
      MessageDB.put(messages.delete).then(function() {
        return MessageDB.retrieve(messages.delete.timestamp);
      }).then(function() {
        assert(false, 'The promise should be rejected');
      }, function() {
        sinon.assert.calledOnce(onDiscardedStub);
        sinon.assert.calledWith(onDiscardedStub, messages.delete);
      }).then(done, done);
    });

    test('delete action messages dispatch a \'deleted\' event',
    function(done) {
      MessageDB.put(messages.current).then(function() {
        return MessageDB.put(messages.delete);
      }).then(function() {
        sinon.assert.calledOnce(onDeletedStub);
        sinon.assert.calledWith(onDeletedStub, messages.current);
      }).then(done, done);
    });

    test('old delete action is ignored', function(done) {
      MessageDB.put(messages.current).then(function() {
        return MessageDB.put(messages.old_delete);
      }).then(function() {
        sinon.assert.notCalled(onDeletedStub);
        return MessageDB.retrieve(messages.current.timestamp);
      }).then(function(message) {
        sinon.assert.calledOnce(onDiscardedStub);
        sinon.assert.calledWith(onDiscardedStub, messages.old_delete);
        assert.ok(message);
      }).then(done, done);
    });
  });

  suite('deleting messages', function() {
    var onDeletedStub;

    setup(function() {
      MessageDB.on('delete', onDeletedStub = this.sinon.stub());
    });

    test('delete messages by timestamp', function(done) {
      MessageDB.put(messages.low).then(function(status) {
        return MessageDB.put(messages.medium);
      }).then(function(status) {
        return MessageDB.put(messages.high);
      }).then(function(status) {
        return MessageDB.deleteByTimestamp(messages.low.timestamp);
      }).then(function() {
        return MessageDB.deleteByTimestamp(messages.medium.timestamp);
      }).then(function() {
        return MessageDB.deleteByTimestamp(messages.high.timestamp);
      }).then(function() {
        return MessageDB.retrieve(messages.low.timestamp);
      }).then(function() {
        assert(false, 'The promise should be rejected');
      }, function() {
        return MessageDB.retrieve(messages.medium.timestamp);
      }).then(function() {
        assert(false, 'The promise should be rejected');
      }, function() {
        return MessageDB.retrieve(messages.high.timestamp);
      }).then(function() {
        assert(false, 'The promise should be rejected');
      }, function() {}).then(done, done);
    });

    test('a \'deleted\' event is dispatched', function(done) {
      MessageDB.put(messages.current).then(function() {
        return MessageDB.deleteByTimestamp(messages.current.timestamp);
      }).then(function() {
        sinon.assert.calledOnce(onDeletedStub);
        sinon.assert.calledWith(onDeletedStub, messages.current);
      }).then(done, done);
    });
  });
});
