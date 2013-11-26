/*global Drafts, Draft, asyncStorage */
'use strict';

requireApp('sms/js/drafts.js');
require('/shared/js/async_storage.js');

suite('Drafts', function() {
  var d1, d2, d3, d4, d5;

  suiteSetup(function() {
    d1 = new Draft({
      recipients: ['555', '666'],
      content: 'This is a draft message',
      timestamp: 1,
      threadId: 42,
      type: 'sms'
    });
    d2 = new Draft({
      recipients: ['555'],
      content: 'This is a draft message',
      timestamp: 2,
      threadId: 42,
      type: 'sms'
    });
    d3 = new Draft({
      recipients: ['555', '222'],
      content: 'This is a draft message',
      timestamp: 3,
      threadId: 1,
      type: 'sms'
    });
    d4 = new Draft({
      recipients: ['555', '333'],
      content: 'This is a draft message',
      timestamp: 4,
      threadId: 2,
      type: 'sms'
    });
    d5 = new Draft({
      recipients: ['555', '444'],
      content: 'This is a draft message',
      timestamp: 5,
      threadId: null,
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
      assert.deepEqual(
        added,
        [d1],
        'Correct draft added at thread id in index');
      assert.equal(
        Drafts.byId(d1.threadId).length,
        1,
        'One draft added to correct thread id in index'
      );

    });

    test('add second draft', function() {
      added = [];
      Drafts.add(d2);
      Drafts.byId(d2.threadId).forEach(function(e) {
        added.push(e);
      });
      assert.deepEqual(
        added,
        [d1, d2],
        'Correct drafts added at thread id in index');
      assert.equal(
        Drafts.byId(d2.threadId).length,
        2,
        'Two drafts added to correct thread id in index'
      );
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
      assert.equal(
        Drafts.byId(d1.threadId).length,
        1,
        'Delete first draft from thread id 42');
    });

    test('delete second draft', function() {
      Drafts.delete(d2);
      assert.equal(
        Drafts.byId(d2.threadId).length,
        0,
        'Delete second draft from thread id 42');
    });

    test('delete third draft', function() {
      Drafts.delete(d3);
      assert.equal(
        Drafts.byId(d3.threadId).length,
        0,
        'Delete draft from thread id 1');
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
      assert.equal(list.length, 2, 'Two drafts returned for id 42');
    });

    test('get drafts for id 1', function() {
      list = Drafts.byId(1);
      assert.equal(list.length, 1, 'One drafts returned for id 1');
    });

    test('get drafts for null id', function() {
      list = Drafts.byId(null);
      assert.equal(list.length, 1, 'One drafts returned for null id');
    });

    test('get drafts for non-existent id', function() {
      list = Drafts.byId(10);
      assert.equal(list.length, 0, 'No drafts returned for id 10');
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
      assert.equal(list1.length, 0, 'No drafts for id 42');
      assert.equal(list2.length, 0, 'No drafts for id 1');
      assert.equal(list3.length, 0, 'No drafts for id 2');
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
      assert.equal(list.length, 0, 'New Drafts.List has length of 0');
    });

    test('length of populated Drafts.List', function() {
      var list = new Drafts.List([d1, d2, d3, d4]);
      assert.equal(list.length, 4, 'Drafts.List with four drafts has length 4');
    });

  });

  suite('forEach >', function() {
    var spy;
    var list;

    setup(function() {
      spy = sinon.spy();
    });

    test('callback function on each draft in Drafts.List', function() {
      list = new Drafts.List([d1, d2, d3, d4]);
      list.forEach(spy);
      assert.equal(spy.callCount, 4, 'callback called four times');
      assert.deepEqual(spy.args[0][0], d1, 'callback called with d1');
      assert.deepEqual(spy.args[1][0], d2, 'callback called with d2');
      assert.deepEqual(spy.args[2][0], d3, 'callback called with d3');
      assert.deepEqual(spy.args[3][0], d4, 'callback called with d4');
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
      assert.deepEqual(
        draft.recipients,
        [],
        'default recipients is empty String'
      );
      assert.deepEqual(draft.content, [], 'default content is empty Array');
      assert.equal(draft.threadId, null, 'default threadId is null');
    });

    test('Draft from Draft object', function() {
      draft = new Draft(d1);
      assert.deepEqual(
        draft.recipients,
        ['555', '666'],
        'recipients is [\'555\', \'666\']'
      );
      assert.deepEqual(
        draft.content,
        'This is a draft message',
        'content is \'This is a draft message\''
      );
      assert.equal(draft.timestamp, 1, 'timestamp is 1');
      assert.equal(draft.threadId, 42, 'timestamp is 42');
      assert.equal(draft.type, 'sms', 'timestamp is \'sms\'');
    });

  });

  suite('Storage', function() {
    var stored = new Map();

    setup(function() {
      Drafts.clear();
      Drafts.add(d1);
      Drafts.add(d2);
      Drafts.add(d5);

      stored.set(d1.threadId, d1);
      stored.set(d5.threadId, d5);
    });

    teardown(function() {
      Drafts.clear();
      asyncStorage.removeItem('draft index');
    });

    test('Store drafts', function() {
      Drafts.store();
      asyncStorage.getItem('draft index', function(value) {
        var retrieved = new Map(value);
        assert.deepEqual(retrieved.get(null), [d5]);
        assert.deepEqual(retrieved.get(42), [d1, d2]);
      });
    });

    test('Load drafts', function() {
      var retrieved = [];
      asyncStorage.setItem('draft index', [...stored], function() {
        Drafts.load();
      });

      Drafts.byId(null).forEach(function(elem) {
        assert.equal(elem, d5);
      });

      Drafts.byId(42).forEach(function(elem) {
        retrieved.push(elem);
      });
      assert.deepEqual(retrieved, [d1, d2]);
    });

  });

});
