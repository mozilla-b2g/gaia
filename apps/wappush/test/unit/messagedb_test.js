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
      created: (new Date('2013-09-03T10:35:34Z')).getTime(),
      action: 'delete',
      text: 'newer message'
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
        function putSuccess(status) {
          MessageDB.put(messages.delete,
            function putSuccess(status) {
              assert.equal(status, 'discarded');

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
});
