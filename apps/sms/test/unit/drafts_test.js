/*global Drafts, Draft, asyncStorage */
'use strict';

requireApp('sms/js/drafts.js');
requireApp('sms/js/is-equal.js');
requireApp('sms/js/utils.js');
require('/shared/js/async_storage.js');

suite('Drafts', function() {
  var d1, d2, d3, d4, d5, d6, d7;

  suiteSetup(function() {
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

  suite('Drafts() >', function() {

    test('Draft', function() {
      assert.ok(Drafts);
      assert.ok(Drafts.add);
      assert.ok(Drafts.delete);
      assert.ok(Drafts.byId);
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
      Drafts.byId(d1.threadId).forEach(function(e) {
        added.push(e);
      });
      assert.deepEqual(added, [d1]);
      assert.equal(Drafts.byId(d1.threadId).length, 1);
    });

    test('add second draft', function() {
      added = [];
      Drafts.add(d2);
      Drafts.byId(d2.threadId).forEach(function(e) {
        added.push(e);
      });
      assert.deepEqual(added, [d2]);
      assert.equal(Drafts.byId(d2.threadId).length, 1);
    });

  });

  suite('delete() >', function() {

    suiteSetup(function() {
      Drafts.add(d1);
      Drafts.add(d2);
      Drafts.add(d3);
    });

    suiteTeardown(function() {
      Drafts.clear();
    });

    test('delete first draft', function() {
      Drafts.delete(d1);
      assert.equal(Drafts.byId(d1.threadId).length, 0);
    });

    test('delete second draft', function() {
      Drafts.delete(d2);
      assert.equal(Drafts.byId(d2.threadId).length, 0);
    });

    test('delete third draft', function() {
      Drafts.delete(d3);
      assert.equal(Drafts.byId(d3.threadId).length, 0);
    });

  });

  suite('byId() >', function() {
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
      list = Drafts.byId(42);
      assert.equal(list.length, 1);
    });

    test('get drafts for id 1', function() {
      list = Drafts.byId(1);
      assert.equal(list.length, 1);
    });

    test('get drafts for null id', function() {
      list = Drafts.byId(null);
      assert.equal(list.length, 1);
    });

    test('get drafts for non-existent id', function() {
      list = Drafts.byId(10);
      assert.equal(list.length, 0);
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
      var list1 = Drafts.byId(42);
      var list2 = Drafts.byId(1);
      var list3 = Drafts.byId(2);
      assert.equal(list1.length, 0);
      assert.equal(list2.length, 0);
      assert.equal(list3.length, 0);
    });

  });

  suite('Drafts.List() >', function() {

    test('Drafts.List', function() {
      var list = new Drafts.List();
      assert.ok(list);
      assert.ok(list.forEach);
    });

  });

  suite('length >', function() {

    test('length of new Drafts.List', function() {
      var list = new Drafts.List();
      assert.equal(list.length, 0);
    });

    test('length of populated Drafts.List', function() {
      var list = new Drafts.List([d1, d2, d3, d4]);
      assert.equal(list.length, 4);
    });

  });

  suite('forEach() >', function() {
    var spy;
    var list;

    setup(function() {
      spy = sinon.spy();
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
      spy.reset();
    });

    test('Store fresh drafts', function() {
      Drafts.add(d1);
      Drafts.add(d2);
      Drafts.add(d5);

      assert.isTrue(spy.calledThrice);

      // TODO test that asyncstorage has the correct drafts?
    });

    test('Store duplicate drafts', function() {
      Drafts.add(d1);
      Drafts.add(d2);
      Drafts.add(d5);

      assert.isFalse(spy.called);

      // TODO test that asyncstorage still has the correct drafts?
    });

    test('Store draft with distinct content', function() {
      Drafts.add(d6);

      assert.isTrue(spy.called);

      // TODO test that asyncstorage still has the correct drafts?
    });

    test('Store draft with distinct subject', function() {
      Drafts.add(d7);

      assert.isTrue(spy.called);

      // TODO test that asyncstorage still has the correct drafts?
    });

    test('Load drafts', function() {
      var loaded = [];
      Drafts.load();

      assert.equal(Drafts.byId(42).length, 1);
      Drafts.byId(42).forEach(function(elem) {
        assert.equal(elem, d1);
      });

      assert.equal(Drafts.byId(44).length, 1);
      Drafts.byId(44).forEach(function(elem) {
        assert.equal(elem, d2);
      });

      assert.equal(Drafts.byId(null).length, 3);

      Drafts.byId(null).forEach(function(elem) {
        loaded.push(elem);
      });
      assert.equal(loaded[0], d5);
      assert.equal(loaded[1], d6);
      assert.equal(loaded[2], d7);

      assert.equal(Drafts.byId(5).length, 0);
    });

  });

});
