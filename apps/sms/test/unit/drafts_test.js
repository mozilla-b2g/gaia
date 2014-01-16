/*global Drafts, Draft, asyncStorage, MocksHelper */
'use strict';

requireApp('sms/js/drafts.js');
requireApp('sms/js/utils.js');
require('/shared/js/async_storage.js');

requireApp('sms/test/unit/mock_async_storage.js');


var MocksHelperForDraftsTest = new MocksHelper([
  'asyncStorage'
]).init();

suite('Drafts', function() {
  var mocksHelper = MocksHelperForDraftsTest;

  var d1, d2, d3, d4, d5, d6, d7;

  suiteSetup(function() {
    mocksHelper.suiteSetup();

    d1 = new Draft({
      recipients: ['555', '666'],
      content: ['This is a draft message'],
      timestamp: 1,
      threadId: 42,
      subject: 'This is a subject',
      type: 'sms',
      id: 1
    });
    d2 = new Draft({
      recipients: ['555'],
      content: ['This is a draft message'],
      timestamp: 2,
      threadId: 44,
      subject: 'This is a subject',
      type: 'sms',
      id: 2
    });
    d3 = new Draft({
      recipients: ['555', '222'],
      content: ['This is a draft message'],
      timestamp: 3,
      threadId: 1,
      subject: 'This is a subject',
      type: 'sms',
      id: 3
    });
    d4 = new Draft({
      recipients: ['555', '333'],
      content: ['This is a draft message'],
      timestamp: 4,
      threadId: 2,
      subject: 'This is a subject',
      type: 'sms',
      id: 4
    });
    d5 = new Draft({
      recipients: ['555', '444'],
      content: ['This is a draft message'],
      timestamp: 5,
      threadId: null,
      subject: 'This is a subject',
      type: 'sms',
      id: 5
    });
    d6 = new Draft({
      recipients: ['123456'],
      content: [
        'This is a draft MMS...',
        {
          blob: {
            type: 'audio/ogg',
            size: 12345
          },
          name: 'audio.oga'
        },
        '...with a recipient and a thread'
      ],
      timestamp: Date.now() - (3600000 * 2),
      threadId: 8,
      type: 'mms',
      id: 6
    });
    d7 = new Draft({
      recipients: ['555', '444'],
      content: ['This is a draft message'],
      timestamp: 5,
      threadId: null,
      subject: 'This is a different subject',
      type: 'sms',
      id: 7
    });
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
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

    test('add threadless draft of same draft.id replaces previous', function() {
      Drafts.add(d5);

      assert.equal(
        Drafts.byThreadId(null).latest.content,
        'This is a draft message'
      );

      Drafts.add({
        recipients: ['555', '444'],
        content: ['This is a new draft message'],
        timestamp: 5,
        threadId: null,
        subject: 'This is a subject',
        type: 'sms',
        id: 5
      });

      assert.equal(
        Drafts.byThreadId(null).latest.content,
        'This is a new draft message'
      );
      assert.equal(Drafts.byThreadId(null).length, 1);
    });

  });

  suite('delete() >', function() {

    suiteSetup(function() {
      [d1, d2, d6, d7].forEach(Drafts.add, Drafts);
    });

    suiteTeardown(function() {
      Drafts.clear();
    });

    test('Delete draft with reference', function() {
      Drafts.delete(d1);
      assert.equal(Drafts.byThreadId(d1.threadId).length, 0);
    });

    test('delete by only threadId', function() {
      Drafts.delete({ threadId: 2 });
      assert.equal(Drafts.byThreadId(2).length, 0);
    });
    test('Deleting new message drafts', function() {
      Drafts.delete(d6);
      // First draft removes only the draft from the Drafts.List
      assert.equal(Drafts.byThreadId(null).length, 1);
      Drafts.delete(d7);
      // The last draft in the thread removes the thread from the index
      assert.equal(Drafts.byThreadId(null).length, 0);
    });

    test('delete by non-draft object', function() {
      var draft = new Draft({
        recipients: ['999999'],
        content: ['foo'],
        timestamp: 2,
        threadId: 999,
        subject: 'This is a subject',
        type: 'sms'
      });

      Drafts.add(draft);

      assert.equal(Drafts.byThreadId(999).length, 1);

      Drafts.delete({
        threadId: 999,
        id: draft.id
      });

      assert.equal(Drafts.byThreadId(999).length, 0);
    });
  });

  suite('Select drafts', function() {
    var list;

    suiteSetup(function() {
      [d1, d2, d3, d4, d5].forEach(Drafts.add, Drafts);
    });

    suiteTeardown(function() {
      Drafts.clear();
    });

    suite('byThreadId', function() {

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

    suiteTeardown(function() {
      Drafts.clear();
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

  suite('forEach()>', function() {

    var spy;

    suiteSetup(function() {
      [d1, d2, d3, d4, d5, d6, d7].forEach(Drafts.add, Drafts);
    });

    suiteTeardown(function() {
      Drafts.clear();
    });

    setup(function() {
      spy = sinon.spy();
    });

    test('callback called on each draft', function() {
      Drafts.forEach(spy);
      assert.equal(spy.callCount, 7);

      // threadId = Number
      assert.deepEqual(spy.args[0][0], d1);
      assert.deepEqual(spy.args[1][0], d2);
      assert.deepEqual(spy.args[2][0], d3);
      assert.deepEqual(spy.args[3][0], d4);
      assert.deepEqual(spy.args[4][0], d5);

      // threadId = null
      assert.deepEqual(spy.args[5][0], d7);
      assert.deepEqual(spy.args[6][0], d6);
    });

  });

  suite('clear() >', function() {

    suiteSetup(function() {
      [d1, d2, d3, d4].forEach(Drafts.add, Drafts);
    });

    test('clear the entire draft index', function() {
      Drafts.clear();
      assert.equal(Drafts.byThreadId(42).length, 0);
      assert.equal(Drafts.byThreadId(1).length, 0);
      assert.equal(Drafts.byThreadId(2).length, 0);
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

    test('forEach does not leak backing array via arguments', function() {
      new Drafts.List([d1]).forEach(function(draft) {
        assert.equal(draft, d1);
        assert.equal(arguments.length, 1);
      });
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
      assert.isFalse(draft.isEdited);
    });

    test('Draft from Draft object', function() {
      draft = new Draft(d1);
      assert.deepEqual(draft.recipients, ['555', '666']);
      assert.deepEqual(draft.content, ['This is a draft message']);
      assert.equal(draft.timestamp, 1);
      assert.equal(draft.threadId, 42);
      assert.equal(draft.type, 'sms');
      assert.isFalse(draft.isEdited);
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

  suite('Storage and Retrieval', function() {
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

    test('Load drafts, has stored data', function(done) {
      this.sinon.stub(asyncStorage, 'getItem').yields([
        [42, [d1]],
        [44, [d2]],
        [null, [d5, d6, d7]]
      ]);

      Drafts.request(function() {
        assert.equal(Drafts.byThreadId(42).length, 1);
        Drafts.byThreadId(42).forEach(function(elem) {
          assert.deepEqual(elem, d1);
        });

        assert.equal(Drafts.byThreadId(44).length, 1);
        Drafts.byThreadId(44).forEach(function(elem) {
          assert.deepEqual(elem, d2);
        });

        assert.equal(Drafts.byThreadId(null).length, 3);
        assert.equal(Drafts.byThreadId(5).length, 0);

        done();
      });
    });

    test('Load, clear, restore drafts', function(done) {
      this.sinon.stub(asyncStorage, 'getItem').yields([
        [42, [d1]],
        [44, [d2]],
        [null, [d5, d6, d7]]
      ]);

      // Load
      Drafts.request(function() {
        assert.equal(Drafts.size, 3);
        assert.isTrue(asyncStorage.getItem.calledOnce);

        // Clear (This will set isCached = false)
        Drafts.clear();

        assert.equal(Drafts.size, 0);

        // Restore
        Drafts.request(function() {
          assert.equal(Drafts.size, 3);
          assert.isTrue(asyncStorage.getItem.calledTwice);
          done();
        });
      });
    });

    test('Load drafts, has no stored data', function(done) {
      this.sinon.stub(asyncStorage, 'getItem').yields([]);

      Drafts.request(function() {
        assert.equal(Drafts.size, 0);
        done();
      });
    });
  });
});
