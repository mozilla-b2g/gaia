/*global Thread, Threads, MockMessages, Draft, Drafts, MockDraft, MockDrafts */

'use strict';

requireApp('sms/js/drafts.js');
requireApp('sms/js/threads.js');

requireApp('sms/test/unit/mock_drafts.js');
requireApp('sms/test/unit/mock_messages.js');


suite('Threads', function() {

  suiteSetup(function() {
    window.location.hash = '';
  });

  teardown(function() {
    Threads.clear();
  });

  suite('createThreadMockup', function() {
    var message;

    setup(function() {
      // Create a message with read status 'true'
      message = MockMessages.sms();
    });

    test(' > createThreadMockup with unread status in options', function() {
      var options = { read: false };
      var thread = Threads.createThreadMockup(message, options);

      assert.equal(thread.unreadCount, 1);
    });

    test(' > createThreadMockup without options', function() {
      var thread = Threads.createThreadMockup(message);
      assert.equal(thread.unreadCount, 0);
    });

    test(' > createThreadMockup with read status in options', function() {
      var options = { read: true };
      var thread = Threads.createThreadMockup(message, options);
      assert.equal(thread.unreadCount, 0);
    });

    test(' > createThreadMockup from SMS sended', function() {
      var options = { read: true };
      message.delivery = 'sent';
      var thread = Threads.createThreadMockup(message, options);
      assert.equal(thread.participants.length, 1);
      assert.equal(thread.participants[0], message.receiver);
    });

    test(' > createThreadMockup from SMS received', function() {
      var options = { read: false };
      message.delivery = 'received';
      var thread = Threads.createThreadMockup(message, options);
      assert.equal(thread.participants.length, 1);
      assert.equal(thread.participants[0], message.sender);
    });

    test(' > createThreadMockup from MMS sending', function() {
      var options = { read: true };
      var mms = MockMessages.mms();
      mms.delivery = 'sent';
      var thread = Threads.createThreadMockup(mms, options);
      assert.equal(thread.participants, mms.receivers);
    });

    test(' > createThreadMockup from MMS received', function() {
      var options = { read: false };
      var mms = MockMessages.mms();
      mms.delivery = 'received';
      var thread = Threads.createThreadMockup(mms, options);
      assert.equal(thread.participants.length, 1);
      assert.equal(thread.participants[0], message.sender);
    });
  });

  suite('Collection', function() {
    test('is like a Map', function() {
      assert.ok(Threads);
      assert.isFunction(Threads.set);
      assert.isFunction(Threads.get);
      assert.isFunction(Threads.has);
      assert.isFunction(Threads.delete);
      assert.isFunction(Threads.clear);
      assert.isNumber(Threads.size);
      assert.equal(Threads.currentId, null);
      assert.equal(Threads.active, null);
    });

    test('Threads.set(key, val)', function() {
      Threads.set(1, {});
      assert.deepEqual(Threads.get(1), { messages: [] });
      assert.equal(Threads.size, 1);
    });

    test('Threads.get(key)', function() {
      Threads.set(1, {});
      var value = Threads.get(1);
      assert.ok(Array.isArray(value.messages));
      assert.equal(Threads.size, 1);
    });

    test('Threads.has(key)', function() {
      assert.equal(Threads.has(1), false);
      Threads.set(1, {});
      assert.equal(Threads.has(1), true);
    });

    test('Threads.delete()', function() {
      Threads.set(1, {});
      assert.equal(Threads.has(1), true);
      assert.equal(Threads.size, 1);
      Threads.delete(1);
      assert.equal(Threads.has(1), false);
      assert.equal(Threads.size, 0);
    });
  });

  suite('Operational', function() {
    setup(function() {
      window.location.hash = '';
    });

    teardown(function() {
      Threads.delete(5);
    });

    test('Threads.currentId', function() {
      window.location.hash = '#thread=5';
      assert.equal(Threads.currentId, 5);

      window.location.hash = '';
      assert.equal(Threads.currentId, null);
    });

    test('Threads.active', function() {
      Threads.set(5, { a: 'alpha' });

      window.location.hash = '#thread=5';
      assert.deepEqual(Threads.active, {
        a: 'alpha',
        messages: []
      });

      window.location.hash = '';
      assert.equal(Threads.active, null);
    });
  });
});

suite('Thread', function() {
  var realDraft;
  var realDrafts;
  var date = new Date();
  var fixture = {
    id: 1,
    participants: ['555'],
    lastMessageType: 'sms',
    body: 'Hello 555',
    timestamp: date,
    unreadCount: 0
  };

  suiteSetup(function() {
    window.location.hash = '';

    realDraft = Draft;
    realDrafts = Drafts;

    Draft = MockDraft;
    Drafts = MockDrafts;
  });

  suiteTeardown(function() {
    Draft = realDraft;
    Drafts = realDrafts;
  });

  teardown(function() {
    Threads.clear();
  });

  setup(function() {
    Threads.set(1, fixture);
  });

  test('Thread', function() {
    assert.ok(Thread);
    assert.include(Thread.prototype, 'drafts');
    assert.include(Thread.prototype, 'hasDrafts');
  });

  test('Thread object', function() {
    var thread = new Thread(fixture);

    assert.deepEqual(thread, {
      id: 1,
      participants: ['555'],
      lastMessageType: 'sms',
      body: 'Hello 555',
      timestamp: date,
      unreadCount: 0,
      messages: []
    });
  });

  test('thread.drafts, hasDrafts', function() {
    this.sinon.stub(Drafts, 'byThreadId').returns([
      {
        id: 101,
        recipients: ['555'],
        content: ['This is a new draft for thread 1'],
        subject: 'This is a subject',
        timestamp: 2,
        threadId: 1,
        type: 'sms'
      }
    ]);

    Threads.set(1, {
      id: 1,
      participants: ['555'],
      lastMessageType: 'sms',
      body: 'Hello 555',
      timestamp: date,
      unreadCount: 0,
      messages: []
    });

    assert.equal(Threads.get(1).drafts.length, 1);
    assert.isTrue(Threads.get(1).hasDrafts);
  });

  test('no thread.drafts, hasDrafts', function() {
    this.sinon.stub(Drafts, 'byThreadId').returns([]);

    Threads.set(1, {
      id: 1,
      participants: ['555'],
      lastMessageType: 'sms',
      body: 'Hello 555',
      timestamp: date,
      unreadCount: 0,
      messages: []
    });

    assert.equal(Threads.get(1).drafts.length, 0);
    assert.isFalse(Threads.get(1).hasDrafts);
  });

});
