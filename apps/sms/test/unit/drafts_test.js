/*global Drafts, Draft, asyncStorage, MockasyncStorage */
'use strict';

requireApp('sms/js/drafts.js');
requireApp('sms/js/is-equal.js');
requireApp('sms/js/utils.js');
require('/shared/js/async_storage.js');

requireApp('sms/test/unit/mock_async_storage.js');

suite('Drafts', function() {
  var realASgetItem, realASsetItem, realASremoveItem;
  var d1, d2, d3, d4, d5, d6, d7;

  suiteSetup(function() {
    realASgetItem = asyncStorage.getItem;
    realASsetItem = asyncStorage.setItem;
    realASremoveItem = asyncStorage.removeItem;

    // Normally this isn't necessary, but jshint
    // claimed that `asyncStorage` was readonly.
    Object.defineProperty(window, 'asyncStorage', {
      value: MockasyncStorage,
      configurable: true,
      writable: true
    });

    d1 = new Draft({
      recipients: ['555', '666'],
      content: ['This is a draft message'],
      timestamp: 1,
      threadId: 42,
      subject: 'This is a subject',
      type: 'sms'
    });
    d2 = new Draft({
      recipients: ['555'],
      content: ['This is a draft message'],
      timestamp: 2,
      threadId: 44,
      subject: 'This is a subject',
      type: 'sms'
    });
    d3 = new Draft({
      recipients: ['555', '222'],
      content: ['This is a draft message'],
      timestamp: 3,
      threadId: 1,
      subject: 'This is a subject',
      type: 'sms'
    });
    d4 = new Draft({
      recipients: ['555', '333'],
      content: ['This is a draft message'],
      timestamp: 4,
      threadId: 2,
      subject: 'This is a subject',
      type: 'sms'
    });
    d5 = new Draft({
      recipients: ['555', '444'],
      content: ['This is a draft message'],
      timestamp: 5,
      threadId: null,
      subject: 'This is a subject',
      type: 'sms'
    });
    d6 = new Draft({
      recipients: ['555', '444'],
      content: ['This is a different draft message'],
      timestamp: 5,
      threadId: null,
      subject: 'This is a subject',
      type: 'sms'
    });
    d7 = new Draft({
      recipients: ['555', '444'],
      content: ['This is a draft message'],
      timestamp: 5,
      threadId: null,
      subject: 'This is a different subject',
      type: 'sms'
    });
  });

  suiteTeardown(function() {
    asyncStorage.getItem = realASgetItem;
    asyncStorage.setItem = realASsetItem;
    asyncStorage.removeItem = realASremoveItem;
  });

  suite('Drafts() >', function() {

    test('Draft', function() {
      assert.ok(Drafts);
      assert.ok(Drafts.add);
      assert.ok(Drafts.delete);
      assert.ok(Drafts.byThreadId);
      assert.ok(Drafts.clear);
    });

  });

  suite('add() >', function() {
    var added;

    suiteTeardown(function() {
      Drafts.clear();
    });

    test('add first draft', function() {
      added = [];
      Drafts.add(d1);
      Drafts.byThreadId(d1.threadId).forEach(function(e) {
        added.push(e);
      });
      assert.deepEqual(added, [d1]);
      assert.equal(Drafts.byThreadId(d1.threadId).length, 1);
    });

    test('add second draft', function() {
      added = [];
      Drafts.add(d2);
      Drafts.byThreadId(d2.threadId).forEach(function(e) {
        added.push(e);
      });
      assert.deepEqual(added, [d2]);
      assert.equal(Drafts.byThreadId(d2.threadId).length, 1);
    });

    test('add draft of same threadId replaces previous', function() {
      Drafts.add(d2);

      var latestId = Drafts.byThreadId(44).latest.id;

      Drafts.add({
        recipients: ['555'],
        content: ['This is a new draft for thread 44'],
        subject: 'This is a subject',
        timestamp: 2,
        threadId: 44,
        type: 'sms'
      });

      assert.notEqual(Drafts.byThreadId(44).latest.id, latestId);
      assert.equal(Drafts.byThreadId(44).length, 1);
    });
  });

  suite('delete() >', function() {

    suiteSetup(function() {
      Drafts.add(d1);
      Drafts.add(d2);
      Drafts.add(d3);
      Drafts.add(d4);
    });

    suiteTeardown(function() {
      Drafts.clear();
    });

    test('delete first draft', function() {
      Drafts.delete(d1);
      assert.equal(Drafts.byThreadId(d1.threadId).length, 0);
    });

    test('delete second draft', function() {
      Drafts.delete(d2);
      assert.equal(Drafts.byThreadId(d2.threadId).length, 0);
    });

    test('delete third draft', function() {
      Drafts.delete(d3);
      assert.equal(Drafts.byThreadId(d3.threadId).length, 0);
    });

    test('delete by only threadId', function() {
      Drafts.delete({ threadId: 2 });
      assert.equal(Drafts.byThreadId(2).length, 0);
    });
  });

  suite('byThreadId(threadId) >', function() {
    var list;

    suiteSetup(function() {
      Drafts.add(d1);
      Drafts.add(d2);
      Drafts.add(d3);
      Drafts.add(d4);
      Drafts.add(d5);
    });

    suiteTeardown(function() {
      Drafts.clear();
    });

    test('get drafts for id 42', function() {
      list = Drafts.byThreadId(42);
      assert.equal(list.length, 1);
    });

    test('get drafts for id 1', function() {
      list = Drafts.byThreadId(1);
      assert.equal(list.length, 1);
    });

    test('get drafts for null id', function() {
      list = Drafts.byThreadId(null);
      assert.equal(list.length, 1);
    });

    test('get drafts for non-existent id', function() {
      list = Drafts.byThreadId(10);
      assert.equal(list.length, 0);
    });

    test('no drafts for a threadId returns useful state', function() {
      list = Drafts.byThreadId(999);
      assert.equal(list.length, 0);
      assert.equal(list.latest, null);
    });
  });

  suite('get(id) > ', function() {
    var id = 101;

    suiteSetup(function() {
      Drafts.add({
        id: id,
        recipients: [],
        content: ['A new message draft with no recipients'],
        type: 'sms'
      });
    });

    test('get draft for id 101', function() {
      var draft = Drafts.get(id);

      assert.equal(draft.id, id);
      assert.equal(draft.threadId, null);
    });

    test('get no draft for non-existant id', function() {
      var draft = Drafts.get(9999999);

      assert.equal(typeof draft, 'undefined');
    });
  });

  suite('clear() >', function() {

    suiteSetup(function() {
      Drafts.add(d1);
      Drafts.add(d2);
      Drafts.add(d3);
      Drafts.add(d4);
    });

    test('clear the entire draft index', function() {
      Drafts.clear();
      var list1 = Drafts.byThreadId(42);
      var list2 = Drafts.byThreadId(1);
      var list3 = Drafts.byThreadId(2);
      assert.equal(list1.length, 0);
      assert.equal(list2.length, 0);
      assert.equal(list3.length, 0);
    });

  });

  suite('Drafts.List() >', function() {

    var spy;
    var list;

    setup(function() {
      spy = sinon.spy();
    });


    test('Drafts.List', function() {
      var list = new Drafts.List();
      assert.ok(list);
      assert.ok(list.forEach);
    });

    test('length of new Drafts.List', function() {
      var list = new Drafts.List();
      assert.equal(list.length, 0);
    });

    test('length of populated Drafts.List', function() {
      var list = new Drafts.List([d1, d2, d3, d4]);
      assert.equal(list.length, 4);
    });

    test('latest of populated Drafts.List', function() {
      var list = new Drafts.List([d1, d2, d3, d4]);
      assert.equal(list.latest, d4);
    });

    test('callback function on each draft in Drafts.List', function() {
      list = new Drafts.List([d1, d2, d3, d4]);
      list.forEach(spy);
      assert.equal(spy.callCount, 4);
      assert.deepEqual(spy.args[0][0], d1);
      assert.deepEqual(spy.args[1][0], d2);
      assert.deepEqual(spy.args[2][0], d3);
      assert.deepEqual(spy.args[3][0], d4);
    });

  });

  suite('Draft', function() {
    var draft;

    test('Draft', function() {
      draft = new Draft();
      assert.ok(Draft);
    });

    test('Draft from empty object', function() {
      draft = new Draft([]);
      assert.deepEqual(draft.recipients, []);
      assert.deepEqual(draft.content, []);
      assert.equal(draft.threadId, null);
    });

    test('Draft from Draft object', function() {
      draft = new Draft(d1);
      assert.deepEqual(draft.recipients, ['555', '666']);
      assert.deepEqual(draft.content, ['This is a draft message']);
      assert.equal(draft.timestamp, 1);
      assert.equal(draft.threadId, 42);
      assert.equal(draft.type, 'sms');
    });

    test('Draft with explicit valid id', function() {
      draft = new Draft({
        id: 101,
        recipients: [],
        content: ['An explicit id'],
        type: 'sms'
      });

      assert.equal(draft.id, 101);
    });

    test('Draft with explicit invalid id', function() {
      try {
        draft = new Draft({
          id: '101',
          recipients: [],
          content: ['An explicit id'],
          timestamp: Date.now(),
          type: 'sms'
        });
        assert.ok(false);
      } catch (e) {
        assert.ok(true);
      }
    });

  });

  suite('Storage', function() {
    var spy;

    suiteSetup(function() {
      Drafts.clear();
      spy = sinon.spy(Drafts, 'store');
    });

    suiteTeardown(function() {
      Drafts.clear();
      asyncStorage.removeItem('draft index');
    });

    setup(function() {
      Drafts.clear();
      spy.reset();
    });

    test('Store fresh drafts', function() {
      Drafts.add(d1);
      Drafts.add(d2);
      Drafts.add(d5);

      assert.isTrue(spy.calledThrice);
    });

    test('Store draft with distinct content', function() {
      Drafts.add(d5);
      // d6 is almost the same as d5, b/w different content
      Drafts.add(d6);

      assert.isTrue(spy.calledTwice);
    });

    test('Store draft with distinct subject', function() {
      Drafts.add(d5);
      // d7 is almost the same as d5, b/w different subject
      Drafts.add(d7);

      assert.isTrue(spy.calledTwice);
    });

    test('Load drafts, has stored data', function() {
      this.sinon.spy(asyncStorage, 'getItem');

      [d1, d2, d5, d6, d7].forEach(Drafts.add, Drafts);
      Drafts.store();

      Drafts.load();

      assert.equal(Drafts.byThreadId(42).length, 1);
      Drafts.byThreadId(42).forEach(function(elem) {
        assert.equal(elem, d1);
      });

      assert.equal(Drafts.byThreadId(44).length, 1);
      Drafts.byThreadId(44).forEach(function(elem) {
        assert.equal(elem, d2);
      });

      assert.equal(Drafts.byThreadId(null).length, 3);
      assert.equal(Drafts.byThreadId(5).length, 0);
    });

    test('Load drafts, has no stored data', function(done) {
      this.sinon.spy(asyncStorage, 'getItem');

      Drafts.load(function(result) {
        assert.equal(result.length, 0);
        done();
      });
    });
  });
});
