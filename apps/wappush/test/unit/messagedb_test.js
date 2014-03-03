/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global MessageDB */

'use strict';

requireApp('wappush/js/messagedb.js');

suite('MessageDB', function() {
  var messages = {
    current: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
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
      timestamp: '3',
      href: 'http://www.mozilla.org',
      id: 'gaia-test@mozilla.org',
      action: 'delete',
      text: ''
    },
    old_delete: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
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
      timestamp: '5',
      href: 'http://www.mozilla.org',
      id: 'http://www.mozilla.org',
      action: 'signal-low',
      text: 'check this out'
    },
    medium: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      timestamp: '6',
      href: 'http://www.mozilla.org',
      id: 'http://www.mozilla.org',
      action: 'signal-medium',
      text: 'check this out'
    },
    high: {
      type: 'text/vnd.wap.si',
      sender: '+31641600986',
      timestamp: '7',
      href: 'http://www.mozilla.org',
      id: 'http://www.mozilla.org',
      action: 'signal-high',
      text: 'check this out'
    }
  };

  teardown(function(done) {
    MessageDB.clear(done);
  });

  suite('storing and retrieving messages', function() {
    test('message is stored', function(done) {
      MessageDB.put(messages.current,
        function putSuccess(status) {
          assert.equal(status, 'new');

          MessageDB.retrieve(messages.current.timestamp,
            function retrieveSuccess(message) {
              done(function checks() {
                assert.equal(message.type, messages.current.type);
                assert.equal(message.sender, messages.current.sender);
                assert.equal(message.href, messages.current.href);
                assert.equal(message.text, messages.current.text);
              });
            });
        });
    });

    test('message is removed after retrieval', function(done) {
      MessageDB.put(messages.current,
        function putSuccess(status) {
          MessageDB.retrieve(messages.current.timestamp,
            function retrieveSuccess(message) {
              MessageDB.retrieve(messages.current.timestamp,
                function retrieveSuccess(message) {
                  done(function checks() {
                    assert.equal(message, null);
                  });
                });
            });
        });
    });
  });

  suite('handling multiple messages', function() {
    test('storing multiple messages with the same si-id', function(done) {
      MessageDB.put(messages.low, function putSuccess(status_low) {
        MessageDB.put(messages.medium, function putSuccess(status_medium) {
          MessageDB.put(messages.high, function putSuccess(status_high) {
            MessageDB.retrieve(messages.low.timestamp,
              function retrieveSuccess(low) {
                MessageDB.retrieve(messages.medium.timestamp,
                  function retrieveSuccess(medium) {
                    MessageDB.retrieve(messages.high.timestamp,
                      function retrieveSuccess(high) {
                        done(function checks() {
                          assert.equal(status_low, 'new');
                          assert.equal(low.id, messages.low.id);
                          assert.equal(low.action, messages.low.action);
                          assert.equal(status_medium, 'new');
                          assert.equal(medium.id, messages.medium.id);
                          assert.equal(medium.action, messages.medium.action);
                          assert.equal(status_high, 'new');
                          assert.equal(high.id, 'http://www.mozilla.org');
                          assert.equal(high.action, 'signal-high');
                        });
                      });
                  });
              });
          });
        });
      });
    });
  });

  suite('out-of-order message handling', function() {
    test('message is updated by newer message', function(done) {
      MessageDB.put(messages.current,
        function putSuccess(status) {
          MessageDB.put(messages.newer,
            function putSuccess(status) {
              assert.equal(status, 'updated');

              MessageDB.retrieve(messages.newer.timestamp,
                function retrieveSuccess(message) {
                  assert.equal(message.text, messages.newer.text);

                  MessageDB.retrieve(messages.current.timestamp,
                    function retrieveSuccess(message) {
                      done(function checks() {
                        assert.equal(message, null);
                      });
                    });
                });
            });
        });
    });

    test('old message is discarded', function(done) {
      MessageDB.put(messages.current,
        function putSuccess(status) {
          MessageDB.put(messages.older,
            function putSuccess(status) {
              assert.equal(status, 'discarded');

              MessageDB.retrieve(messages.older.timestamp,
                function retrieveSuccess(message) {
                  done(function checks() {
                    assert.equal(message, null);
                  });
                });
            });
        });
    });
  });

  suite('message actions', function() {
    test('delete action removes all message with same id', function(done) {
      MessageDB.put(messages.current,
        function putSuccess() {
          MessageDB.put(messages.delete,
            function putSuccess(status) {
              MessageDB.retrieve(messages.current.timestamp,
                function retrieveSuccess(message) {
                  done(function checks() {
                    assert.equal(status, 'discarded');
                    assert.equal(message, null);
                  });
                });
            });
        });
    });

    test('delete action messages are never stored', function(done) {
      MessageDB.put(messages.delete, function putSuccess(status) {
        MessageDB.retrieve(messages.delete.timestamp,
          function retrieveSuccess(message) {
            done(function checks() {
              assert.equal(status, 'discarded');
              assert.equal(message, null);
            });
          });
      });
    });

    test('old delete action is ignored', function(done) {
      MessageDB.put(messages.current,
        function putSuccess(status) {
          MessageDB.put(messages.old_delete,
            function putSuccess(status) {
              assert.equal(status, 'discarded');

              MessageDB.retrieve(messages.current.timestamp,
                function retrieveSuccess(message) {
                  done(function checks() {
                    assert.ok(message);
                  });
                });
            });
        });
    });
  });
});
