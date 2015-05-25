/*global Thread, Threads, MockMessages, Drafts, MocksHelper */

'use strict';

require('/services/js/drafts.js');
require('/services/js/threads.js');

require('/services/test/unit/mock_drafts.js');
require('/views/shared/test/unit/mock_messages.js');


var mocksHelperForThreadsTest = new MocksHelper([
  'Drafts'
]).init();

function assertDeepEqual(test, expected) {
  for (var key in expected) {
    assert.deepEqual(test[key], expected[key]);
  }
}

suite('Threads', function() {
  var message;

  mocksHelperForThreadsTest.attachTestHelpers();

  setup(function() {
    // Create a message with read status 'true'
    message = MockMessages.sms();
  });

  teardown(function() {
    Threads.clear();
  });

  suite('create', function() {
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

      assertDeepEqual(thread, {
        // id was used
        id: 1,
        participants: ['555'],
        body: 'This is a new draft for thread 44',
        timestamp: new Date(now),
        unreadCount: 0,
        lastMessageSubject: undefined,
        lastMessageType: 'sms',
        messages: new Map()
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

      assertDeepEqual(thread, {
        // threadId was used
        id: 44,
        participants: ['555'],
        body: 'This is a new draft for thread 44',
        timestamp: new Date(now),
        unreadCount: 0,
        lastMessageSubject: undefined,
        lastMessageType: 'sms',
        messages: new Map()
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
      assertDeepEqual(Threads.get(1), {
        body: undefined,
        id: undefined,
        lastMessageSubject: undefined,
        lastMessageType: undefined,
        participants: undefined,
        timestamp: undefined,
        unreadCount: undefined,
        messages: new Map()
      });
      assert.equal(Threads.size, 1);
    });

    test('Threads.get(key)', function() {
      Threads.set(1, {});
      var value = Threads.get(1);
      assert.ok(value.messages instanceof Map);
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
      this.sinon.spy(Drafts, 'delete');
      this.sinon.stub(Drafts, 'store');

      this.sinon.stub(Threads, 'get').returns({
        id: 1,
        getDraft: () => { return { threadId: 1 }; }
      });

      Threads.delete(1);

      sinon.assert.calledWith(Drafts.delete, { threadId: 1 });
      sinon.assert.callOrder(Drafts.delete, Drafts.store);
    });

    suite('Threads.registerMessage/unregisterMessage', function () {
      setup(function() {
        this.sinon.spy(Threads, 'get');
      });
      test('thread existed', function() {
        Threads.set(1, {});
        Threads.registerMessage(message);
        assert.equal(Threads.get(1).messages.get(message.id), message);

        // unregister the message
        Threads.unregisterMessage(message.id);
        assert.isUndefined(Threads.get(1).messages.get(message.id));
      });

      test('thread does not exist', function() {
        Threads.registerMessage(message);
        assert.isTrue(Threads.has(1));
        assert.equal(Threads.get(1).messages.get(message.id), message);
      });

      test('remove the message that does not exist in Threads', function() {
        Threads.unregisterMessage(message);
        sinon.assert.notCalled(Threads.get);
      });
    });
  });

  suite('Operational', function() {
    teardown(function() {
      Threads.delete(5);
    });

    test('Threads.active', function() {
      Threads.set(5, {});
      Threads.currentId = 5;

      assertDeepEqual(Threads.active, { body: undefined,
        id: undefined,
        lastMessageSubject: undefined,
        lastMessageType: undefined,
        participants: undefined,
        timestamp: undefined,
        unreadCount: undefined,
        messages: new Map()
      });

      Threads.currentId = null;
      assert.equal(Threads.active, null);
    });
  });
});

suite('Thread', function() {
  var date = new Date();
  var fixture = {
    id: 1,
    participants: ['555'],
    lastMessageType: 'sms',
    body: 'Hello 555',
    timestamp: date,
    unreadCount: 0
  };

  mocksHelperForThreadsTest.attachTestHelpers();

  teardown(function() {
    Threads.clear();
  });

  setup(function() {
    Threads.set(1, fixture);
  });

  test('Thread object', function() {
    var thread = new Thread(fixture);

    assertDeepEqual(thread, {
      id: 1,
      participants: ['555'],
      lastMessageSubject: undefined,
      lastMessageType: 'sms',
      body: 'Hello 555',
      timestamp: date,
      unreadCount: 0,
      messages: new Map()
    });
  });

  test('thread has draft', function() {
    var draft = {
      id: 101,
      recipients: ['555'],
      content: ['This is a new draft for thread 1'],
      subject: 'This is a subject',
      timestamp: 2,
      threadId: 1,
      type: 'sms'
    };

    this.sinon.stub(Drafts, 'byThreadId').withArgs(1).returns(draft);

    Threads.set(1, {
      id: 1,
      participants: ['555'],
      lastMessageType: 'sms',
      body: 'Hello 555',
      timestamp: date,
      unreadCount: 0,
      messages: new Map()
    });

    assert.deepEqual(Threads.get(1).getDraft(), draft);
  });

  test('thread does not have draft', function() {
    this.sinon.stub(Drafts, 'byThreadId').withArgs(1).returns(null);

    Threads.set(1, {
      id: 1,
      participants: ['555'],
      lastMessageType: 'sms',
      body: 'Hello 555',
      timestamp: date,
      unreadCount: 0,
      messages: new Map()
    });

    assert.isNull(Threads.get(1).getDraft());
  });

});
