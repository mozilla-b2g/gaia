/*global asyncStorage,
         Drafts,
         Draft,
         InterInstanceEventDispatcher,
         MocksHelper
*/

'use strict';

require('/shared/js/event_dispatcher.js');
require('/services/js/drafts.js');
require('/views/shared/js/utils.js');

require('/shared/test/unit/mocks/mock_async_storage.js');
require('/views/shared/test/unit/mock_inter_instance_event_dispatcher.js');


var MocksHelperForDraftsTest = new MocksHelper([
  'asyncStorage',
  'InterInstanceEventDispatcher'
]).init();

suite('Drafts', function() {
  var mocksHelper = MocksHelperForDraftsTest;

  var threadDraft1, threadDraft2, threadDraft3, threadDraft4, threadDraft5;
  var draft1, draft2;

  suiteSetup(function() {
    mocksHelper.suiteSetup();

    threadDraft1 = new Draft({
      recipients: ['555', '666'],
      content: ['This is a draft message'],
      timestamp: 1,
      threadId: 42,
      subject: 'This is a subject',
      type: 'sms',
      id: 1
    });
    threadDraft2 = new Draft({
      recipients: ['555'],
      content: ['This is a draft message'],
      timestamp: 2,
      threadId: 44,
      subject: 'This is a subject',
      type: 'sms',
      id: 2
    });
    threadDraft3 = new Draft({
      recipients: ['555', '222'],
      content: ['This is a draft message'],
      timestamp: 3,
      threadId: 1,
      subject: 'This is a subject',
      type: 'sms',
      id: 3
    });
    threadDraft4 = new Draft({
      recipients: ['555', '333'],
      content: ['This is a draft message'],
      timestamp: 4,
      threadId: 2,
      subject: 'This is a subject',
      type: 'sms',
      id: 4
    });
    draft1 = new Draft({
      recipients: ['555', '444'],
      content: ['This is a draft message'],
      timestamp: 5,
      threadId: null,
      subject: 'This is a subject',
      type: 'sms',
      id: 5
    });
    threadDraft5 = new Draft({
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
    draft2 = new Draft({
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

  suite('add() >', function() {
    var onSavedStub;

    setup(function() {
      onSavedStub = sinon.stub();
      Drafts.on('saved', onSavedStub);
    });

    teardown(function() {
      Drafts.clear().offAll('saved');
    });

    test('correctly adds thread bound drafts', function() {
      Drafts.add(threadDraft1);

      assert.deepEqual(Drafts.byThreadId(threadDraft1.threadId), threadDraft1);
      assert.isNull(Drafts.byThreadId(threadDraft2.threadId));

      sinon.assert.calledOnce(onSavedStub);
      sinon.assert.calledWith(onSavedStub, threadDraft1);

      Drafts.add(threadDraft2);

      assert.deepEqual(Drafts.byThreadId(threadDraft1.threadId), threadDraft1);
      assert.deepEqual(Drafts.byThreadId(threadDraft2.threadId), threadDraft2);

      sinon.assert.calledTwice(onSavedStub);
      sinon.assert.calledWith(onSavedStub, threadDraft2);
    });

    test('correctly adds thread less drafts', function() {
      Drafts.add(draft1);

      assert.deepEqual(Drafts.byDraftId(draft1.id), draft1);
      assert.isNull(Drafts.byDraftId(draft2.id));

      sinon.assert.calledOnce(onSavedStub);
      sinon.assert.calledWith(onSavedStub, draft1);

      Drafts.add(draft2);

      assert.deepEqual(Drafts.byDraftId(draft1.id), draft1);
      assert.deepEqual(Drafts.byDraftId(draft2.id), draft2);

      sinon.assert.calledTwice(onSavedStub);
      sinon.assert.calledWith(onSavedStub, draft2);
    });

    test('add draft of same threadId replaces previous', function() {
      assert.equal(
        Drafts.add(threadDraft2).byThreadId(threadDraft2.threadId).id,
        threadDraft2.id
      );

      sinon.assert.calledOnce(onSavedStub);
      sinon.assert.calledWith(onSavedStub, threadDraft2);

      var updatedDraft = new Draft({
        recipients: ['555'],
        content: ['This is a new draft for thread 44'],
        subject: 'This is a subject',
        timestamp: 2,
        threadId: 44,
        type: 'sms'
      });

      Drafts.add(updatedDraft);

      assert.notEqual(Drafts.byThreadId(44).id, threadDraft2.id);

      sinon.assert.calledTwice(onSavedStub);
      sinon.assert.calledWith(onSavedStub, updatedDraft);
    });

    test('add threadless draft of same draft.id replaces previous', function() {
      assert.equal(
        Drafts.add(draft1).byDraftId(draft1.id).content,
        'This is a draft message'
      );

      sinon.assert.calledOnce(onSavedStub);
      sinon.assert.calledWith(onSavedStub, draft1);

      var updatedDraft = new Draft({
        recipients: ['555', '444'],
        content: ['This is a new draft message'],
        timestamp: 5,
        threadId: null,
        subject: 'This is a subject',
        type: 'sms',
        id: 5
      });

      Drafts.add(updatedDraft);

      assert.equal(
        Drafts.byDraftId(draft1.id).content,
        'This is a new draft message'
      );

      sinon.assert.calledTwice(onSavedStub);
      sinon.assert.calledWith(onSavedStub, updatedDraft);
    });
  });

  suite('delete() >', function() {
    var onDeletedStub;

    setup(function() {
      onDeletedStub = sinon.stub();
      Drafts.on('deleted', onDeletedStub);

      [threadDraft1, threadDraft2, threadDraft5, draft2].forEach(
        Drafts.add, Drafts
      );
    });

    teardown(function() {
      Drafts.clear().offAll('deleted');
    });

    test('Delete draft with reference', function() {
      assert.isNotNull(Drafts.byThreadId(threadDraft1.threadId));
      assert.isNull(
        Drafts.delete(threadDraft1).byThreadId(threadDraft1.threadId)
      );

      sinon.assert.calledOnce(onDeletedStub);
      sinon.assert.calledWith(onDeletedStub, threadDraft1);
    });

    test('Deleting new message drafts', function() {
      assert.isNotNull(Drafts.byThreadId(threadDraft5.threadId));
      assert.isNotNull(Drafts.byDraftId(draft2.id));

      // First draft removes only the draft from the drafts
      assert.isNull(
        Drafts.delete(threadDraft5).byThreadId(threadDraft5.threadId)
      );
      assert.isNotNull(Drafts.byDraftId(draft2.id));

      sinon.assert.calledOnce(onDeletedStub);
      sinon.assert.calledWith(onDeletedStub, threadDraft5);

      // The last draft in the thread removes the thread from the index
      assert.isNull(Drafts.delete(draft2).byDraftId(draft2.id));

      sinon.assert.calledTwice(onDeletedStub);
      sinon.assert.calledWith(onDeletedStub, draft2);
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

      assert.deepEqual(Drafts.byThreadId(999), draft);

      var draftToDelete = new Draft({
        threadId: 999,
        id: draft.id
      });

      Drafts.delete(draftToDelete);

      assert.isNull(Drafts.byThreadId(999));

      sinon.assert.calledOnce(onDeletedStub);
      sinon.assert.calledWith(onDeletedStub, draftToDelete);
    });

    test('does not fire "deleted" event if nothing was deleted', function() {
      // Try to delete draft that doesn't exist.
      Drafts.delete(draft1);

      sinon.assert.notCalled(onDeletedStub);
    });
  });

  suite('Select drafts', function() {
    suiteSetup(function() {
      [threadDraft1, threadDraft2, threadDraft3, threadDraft4, draft1].forEach(
        Drafts.add, Drafts
      );
    });

    suiteTeardown(function() {
      Drafts.clear();
    });

    suite('byThreadId', function() {
      test('get drafts for id 1', function() {
        assert.deepEqual(
          Drafts.byThreadId(threadDraft3.threadId), threadDraft3
        );
      });

      test('throws if threadId is not a number', function() {
        assert.throws(() => Drafts.byThreadId(null));
      });

      test('returns null if there is no draft for the thread id', function() {
        assert.isNull(Drafts.byThreadId(10));
      });
    });
  });

  suite('get(id) > ', function() {
    var id = 101;

    suiteSetup(function() {
      Drafts.add(new Draft({
        id: id,
        recipients: [],
        content: ['A new message draft with no recipients'],
        type: 'sms'
      }));
    });

    suiteTeardown(function() {
      Drafts.clear();
    });

    test('get draft for id 101', function() {
      var draft = Drafts.byDraftId(id);

      assert.equal(draft.id, id);
      assert.equal(draft.threadId, null);
    });

    test('get no draft for non-existant id', function() {
      assert.isNull(Drafts.byDraftId(9999999));
    });
  });

  suite('getAll()>', function() {
    setup(function() {
      [
        threadDraft1,
        threadDraft2,
        threadDraft3,
        threadDraft4,
        threadDraft5,
        draft1,
        draft2
      ].forEach(Drafts.add, Drafts);
    });

    teardown(function() {
      Drafts.clear();
    });

    test('getAll returns all drafts', function() {
      var orderedDrafts = [
        threadDraft1,
        threadDraft2,
        threadDraft3,
        threadDraft4,
        threadDraft5,
        draft1,
        draft2
      ];

      for (var draft of Drafts.getAll()) {
        assert.deepEqual(draft, orderedDrafts.shift());
      }

      // All drafts were examined
      assert.equal(orderedDrafts.length, 0);
    });
  });

  suite('clear() >', function() {
    suiteSetup(function() {
      [threadDraft1, threadDraft2, threadDraft3, threadDraft4].forEach(
        Drafts.add, Drafts
      );
    });

    test('clear the entire draft index', function() {
      Drafts.clear();

      assert.isNull(Drafts.byThreadId(42));
      assert.isNull(Drafts.byThreadId(1));
      assert.isNull(Drafts.byThreadId(2));
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
      draft = new Draft(threadDraft1);
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
    setup(function() {
      Drafts.clear();
      this.sinon.spy(Drafts, 'store');
      this.sinon.useFakeTimers();
    });

    test('Store fresh drafts', function() {
      Drafts.add(threadDraft1);
      Drafts.add(threadDraft2);
      Drafts.add(draft1);

      sinon.assert.calledThrice(Drafts.store);
    });

    test('Store draft with distinct content', function() {
      Drafts.add(draft1);
      // threadDraft5 is almost the same as draft1, b/w different content
      Drafts.add(threadDraft5);

      sinon.assert.calledTwice(Drafts.store);
    });

    test('Store draft with distinct subject', function() {
      Drafts.add(draft1);
      // draft2 is almost the same as draft1, b/w different subject
      Drafts.add(draft2);

      sinon.assert.calledTwice(Drafts.store);
    });

    test('Load drafts, has stored data', function(done) {
      this.sinon.stub(asyncStorage, 'getItem').yields([
        [42, [threadDraft1]],
        [44, [threadDraft2]],
        [null, [draft1, draft2]]
      ]);

      Drafts.request().then(function() {
        assert.deepEqual(Drafts.byThreadId(42), threadDraft1);

        assert.deepEqual(Drafts.byThreadId(44), threadDraft2);

        var threadLessDrafts = Array.from(Drafts.getAll()).filter(
          (draft) => !draft.threadId
        );
        assert.equal(threadLessDrafts.length, 2);
        assert.isNull(Drafts.byThreadId(5));
      }).then(done, done);
    });

    test('Load, clear, restore drafts', function(done) {
      this.sinon.stub(asyncStorage, 'getItem').yields([
        [42, [threadDraft1]],
        [44, [threadDraft2]],
        [null, [draft1, draft2]]
      ]);

      // Load
      Drafts.request().then(function() {
        assert.equal(Drafts.size, 3);
        assert.isTrue(asyncStorage.getItem.calledOnce);

        // Clear (This will set isCached = false)
        Drafts.clear();

        assert.equal(Drafts.size, 0);

        // Restore
        return Drafts.request().then(function() {
          assert.equal(Drafts.size, 3);
          assert.isTrue(asyncStorage.getItem.calledTwice);
        });
      }).then(done, done);
    });

    test('Load drafts, has no stored data', function(done) {
      this.sinon.stub(asyncStorage, 'getItem').yields([]);

      Drafts.request().then(function() {
        assert.equal(Drafts.size, 0);
      }).then(done, done);
    });

    test('signals to InterInstanceEventDispatcher when drafts are stored',
    function() {
      this.sinon.spy(InterInstanceEventDispatcher, 'emit');
      this.sinon.stub(asyncStorage, 'setItem');

      Drafts.store();
      sinon.assert.notCalled(
        InterInstanceEventDispatcher.emit,
        'Should not be called until drafts are really saved'
      );

      asyncStorage.setItem.yield();

      sinon.assert.calledWith(
        InterInstanceEventDispatcher.emit, 'drafts-changed'
      );
    });

    suite('drafts index cache >', function() {
      setup(function() {
        this.sinon.stub(asyncStorage, 'getItem').
          withArgs('draft index').
          yields(null);
      });

      test('is properly populated', function(done) {
        Drafts.request().then(() => {
          sinon.assert.calledOnce(asyncStorage.getItem);

          return Drafts.request();
        }).then(() => {
          sinon.assert.calledOnce(asyncStorage.getItem);
        }).then(done, done);
      });

      test('is properly refreshed with force parameter', function(done) {
        Drafts.request().then(() => {
          sinon.assert.calledOnce(asyncStorage.getItem);

          // "Force" parameter should re-request data from asyncStorage even if
          // it's already cached
          return Drafts.request(true);
        }).then(() => {
          sinon.assert.calledTwice(asyncStorage.getItem);
        }).then(done, done);
      });
    });
  });
});
