/*global Thread, Threads, MockMessages, Drafts, MocksHelper */

'use strict';

requireApp('sms/js/drafts.js');
requireApp('sms/js/threads.js');

requireApp('sms/test/unit/mock_drafts.js');
requireApp('sms/test/unit/mock_messages.js');


var MocksHelperForThreadsTest = new MocksHelper([
  'Drafts'
]).init();

suite('Threads', function() {
  var mocksHelper = MocksHelperForThreadsTest;

  suiteSetup(function() {
    window.location.hash = '';
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  teardown(function() {
    Threads.clear();
  });

  suite('create', function() {
    var message;

    setup(function() {
      // Create a message with read status 'true'
      message = MockMessages.sms();
    });

    test('Thread.fromMessage, Thread.fromDraft', function() {
      assert.ok(Thread.fromMessage);
      assert.ok(Thread.fromDraft);
    });

    test(' > create with unread status in options', function() {
      var options = { unread: true };
      var thread = Thread.create(message, options);

      assert.equal(thread.unreadCount, 1);
    });

    test(' > create without options', function() {
      var thread = Thread.create(message);
      assert.equal(thread.unreadCount, 0);
    });

    test(' > create with read status in options', function() {
      var options = { read: true };
      var thread = Thread.create(message, options);
      assert.equal(thread.unreadCount, 0);
    });

    test(' > create from SMS sended', function() {
      var options = { read: true };
      message.delivery = 'sent';
      var thread = Thread.create(message, options);
      assert.equal(thread.participants.length, 1);
      assert.equal(thread.participants[0], message.receiver);
    });

    test(' > create from SMS received', function() {
      var options = { unread: true };
      message.delivery = 'received';
      var thread = Thread.create(message, options);
      assert.equal(thread.participants.length, 1);
      assert.equal(thread.participants[0], message.sender);
    });

    test(' > create from MMS sending', function() {
      var options = { read: true };
      var mms = MockMessages.mms();
      mms.delivery = 'sent';
      var thread = Thread.create(mms, options);
      assert.equal(thread.participants, mms.receivers);
    });

    test(' > create from MMS received', function() {
      var options = { unread: true };
      var mms = MockMessages.mms();
      mms.delivery = 'received';
      var thread = Thread.create(mms, options);
      assert.equal(thread.participants.length, 1);
      assert.equal(thread.participants[0], message.sender);
    });

    test(' > create from Draft with null threadId', function() {
      var now = Date.now();
      var thread = Thread.create({
        id: 1,
        recipients: ['555'],
        content: ['This is a new draft for thread 44'],
        subject: 'This is a subject',
        timestamp: now,
        threadId: null,
        type: 'sms'
      });

      assert.deepEqual(thread, {
        // id was used
        id: 1,
        participants: ['555'],
        body: 'This is a new draft for thread 44',
        timestamp: new Date(now),
        unreadCount: 0,
        lastMessageSubject: undefined,
        lastMessageType: 'sms',
        messages: []
      });
    });

    test(' > create from Draft with a threadId', function() {
      var now = Date.now();
      var thread = Thread.create({
        id: 1,
        recipients: ['555'],
        content: ['This is a new draft for thread 44'],
        subject: 'This is a subject',
        timestamp: now,
        threadId: 44,
        type: 'sms'
      });

      assert.deepEqual(thread, {
        // threadId was used
        id: 44,
        participants: ['555'],
        body: 'This is a new draft for thread 44',
        timestamp: new Date(now),
        unreadCount: 0,
        lastMessageSubject: undefined,
        lastMessageType: 'sms',
        messages: []
      });
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
      assert.deepEqual(Threads.get(1), {
        body: undefined,
        id: undefined,
        lastMessageSubject: undefined,
        lastMessageType: undefined,
        participants: undefined,
        timestamp: undefined,
        unreadCount: undefined,
        messages: []
      });
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

    test('Threads.delete() calls Drafts.delete()', function() {
      this.sinon.stub(Drafts, 'delete');
      this.sinon.stub(Threads, 'get').returns({
        id: 1,
        hasDrafts: true
      });

      Threads.delete(1);

      assert.isTrue(Drafts.delete.calledWith({ threadId: 1 }));
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
      Threads.set(5, {});

      window.location.hash = '#thread=5';
      assert.deepEqual(Threads.active, { body: undefined,
        id: undefined,
        lastMessageSubject: undefined,
        lastMessageType: undefined,
        participants: undefined,
        timestamp: undefined,
        unreadCount: undefined,
        messages: []
      });

      window.location.hash = '';
      assert.equal(Threads.active, null);
    });
  });
});

suite('Thread', function() {
  var mocksHelper = MocksHelperForThreadsTest;
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
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
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
      lastMessageSubject: undefined,
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
