'use strict';

/* global MockPromise, PromiseStorage, UserDictionary, WordListConverter */

require('/shared/test/unit/mocks/mock_promise.js');
require('/js/shared/promise_storage.js');

require('/js/settings/word_list_converter.js');
require('/js/settings/user_dictionary.js');

suite('UserDictionary', function() {
  var model;
  var stubPromiseStorage;
  var stubWordListConverter;

  // Note in comparing against Set(): deepEqual won't work like
  // deepEqual(set1, set2).
  // Please use deepEqual(Array.from(set1), Array.from(set2)).

  setup(function() {
    model = new UserDictionary();

    this.sinon.stub(window, 'Promise', MockPromise);

    stubPromiseStorage =
      this.sinon.stub(Object.create(PromiseStorage.prototype));
    this.sinon.stub(window, 'PromiseStorage')
      .returns(stubPromiseStorage);

    stubWordListConverter =
      this.sinon.stub(Object.create(WordListConverter.prototype));
    this.sinon.stub(window, 'WordListConverter')
      .returns(stubWordListConverter);

    model.start();

    assert.isTrue(stubPromiseStorage.start.calledOnce);
  });

  teardown(function() {
    model.stop();

    assert.isTrue(stubPromiseStorage.stop.calledOnce);
  });

  suite('getList', function() {
    var pDB;
    var pRet;

    setup(function() {
      pDB = new MockPromise();
      model._dbStore.getItem.returns(pDB);

      pRet = model.getList();

      assert.isTrue(model._dbStore.getItem.calledWith('wordlist'));

      // see if the returned-by-getList promise depends on dbStore's
      // promise.
      assert.equal(pRet,
                   pDB.then.firstCall.returnValue.catch.firstCall.returnValue);
    });

    test('normal result', function(){
      var ret = pDB.mFulfillToValue(['star', 'stare', 'starry']);

      assert.deepEqual(Array.from(ret), ['star', 'stare', 'starry']);
    });
    test('undefined result = empty list', function(){
      var ret = pDB.mFulfillToValue(undefined);

      assert.deepEqual(Array.from(ret), []);
    });
    test('empty result = empty list', function(){
      var ret = pDB.mFulfillToValue([]);

      assert.deepEqual(Array.from(ret), []);
    });
    test('promise rejected result = empty list with console log', function(){
      this.sinon.stub(window.console, 'error');

      var ret = pDB.mRejectToError('errorInDB');

      assert.deepEqual(Array.from(ret), []);
      assert.isTrue(window.console.error.calledOnce);
    });
  });

  suite('addWord', function() {
    var pSaveList;

    setup(function() {
      pSaveList = new MockPromise();
      this.sinon.stub(model, '_saveDict').returns(pSaveList);

      model._wordSet = new Set();
    });

    test('normal case', function(){
      var pRet = model.addWord('star');

      assert.equal(pRet, pSaveList);
      assert.deepEqual(Array.from(model._wordSet), ['star']);
    });
    test('word is trimmed correctly', function(){
      var pRet = model.addWord('   star\t  ');

      assert.equal(pRet, pSaveList);
      assert.deepEqual(Array.from(model._wordSet), ['star']);
    });
    test('existing word', function(){
      var pRej = new MockPromise();
      var stubReject = this.sinon.stub(Promise, 'reject').returns(pRej);

      model.addWord('star');
      var pRet = model.addWord('star');

      assert.isTrue(stubReject.calledWith('existing'));
      assert.equal(pRej, pRet);
    });
  });

  suite('updateWord', function() {
    var pSaveList;

    setup(function() {
      pSaveList = new MockPromise();
      this.sinon.stub(model, '_saveDict').returns(pSaveList);

      model._wordSet = new Set(['oldstar']);
    });

    test('normal case', function(){
      var pRet = model.updateWord('oldstar', 'newstar');

      assert.equal(pRet, pSaveList);
      assert.deepEqual(Array.from(model._wordSet), ['newstar']);
    });
    test('old word === new word', function(){
      var pRes = new MockPromise();
      this.sinon.stub(Promise, 'resolve').returns(pRes);

      var pRet = model.updateWord('oldstar', 'oldstar');

      assert.isTrue(Promise.resolve.calledWith(['oldstar']),
        'resolve() should be called with wordlist as parameter');
      assert.equal(pRet, pRes);
    });
    test('new word is trimmed correctly', function(){
      var pRet = model.updateWord('oldstar', '   newstar\t  ');

      assert.equal(pRet, pSaveList);
      assert.deepEqual(Array.from(model._wordSet), ['newstar']);
    });
    test('existing new word', function(){
      var pRej = new MockPromise();
      var stubReject = this.sinon.stub(Promise, 'reject').returns(pRej);

      model._wordSet.add('newstar');

      var pRet = model.updateWord('oldstar', 'newstar');

      assert.deepEqual(Array.from(model._wordSet), ['newstar']);

      var pSaveListThen = pSaveList.mGetNextPromise();

      assert.equal(pRet, pSaveListThen);

      var pRetSaveListThen = pSaveList.mFulfillToValue(undefined);

      assert.equal(pRetSaveListThen, pRej);

      assert.isTrue(stubReject.calledWith('existing'));
    });
  });

  test('removeWord', function() {
    var pSaveList = new MockPromise();
    this.sinon.stub(model, '_saveDict').returns(pSaveList);

    model._wordSet = new Set(['star']);

    var pRet = model.removeWord('star');
    assert.equal(pRet, pSaveList);

    assert.deepEqual(Array.from(model._wordSet), []);
  });

  suite('saveDict', function() {
    // we test successive three calls to saveDict and make sure they're properly
    // queued. We use native Promise to ease the checking since the chaining
    // isn't very complex.

    var rSaveQueue;
    var pSave1, pSave2, pSave3;
    var rDB1, rDB2, rDB3;
    var pDB1, pDB2, pDB3;

    setup(function() {
      window.Promise.restore();

      model._saveQueue = new Promise(resolve => (rSaveQueue = resolve));

      pDB1 = new Promise(resolve => (rDB1 = resolve));
      pDB2 = new Promise(resolve => (rDB2 = resolve));
      pDB3 = new Promise(resolve => (rDB3 = resolve));

      model._dbStore.setItems
        .onFirstCall().returns(pDB1)
        .onSecondCall().returns(pDB2)
        .onThirdCall().returns(pDB3);
    });

    test('Correct queuing', function(done) {
      model._wordSet = new Set(['a']);
      stubWordListConverter.toBlob.returns('someblob');

      pSave1 = model._saveDict();
      pSave2 = model._saveDict();
      pSave3 = model._saveDict();

      assert.isFalse(model._dbStore.setItems.called);

      assert.isTrue(window.WordListConverter.calledWith(['a']));
      assert.isTrue(stubWordListConverter.toBlob.called);

      // trigger the queue and resolve the first setItems Promise such that
      // pSave1's then() will execute. Same for the second and third Promises.

      rSaveQueue();
      rDB1();

      pSave1.then(() => {
        assert.isTrue(model._dbStore.setItems.calledOnce);
        rDB2();
      }, done);

      pSave2.then(() => {
        assert.isTrue(model._dbStore.setItems.calledTwice);
        rDB3();
      }, done);

      pSave3.then(() => {
        assert.isTrue(model._dbStore.setItems.calledThrice);
        assert.isTrue(model._dbStore.setItems.alwaysCalledWith({
          wordlist: ['a'],
          dictblob: 'someblob'
        }));

        done();
      }, done);
    });

    test('Empty list => undefined blob', function(done) {
      model._wordSet = new Set([]);

      pSave1 = model._saveDict();

      assert.isFalse(stubWordListConverter.toBlob.called);

      rSaveQueue();
      rDB1();

      pSave1.then(() => {
        assert.isTrue(model._dbStore.setItems.calledWith({
          wordlist: [],
          dictblob: undefined
        }));

        done();
      }, done);
    });

    test('Word list is returned and sorted', function(done) {
      model._wordSet = new Set(['apply', 'Banana', 'Apple']);

      pSave1 = model._saveDict();

      rSaveQueue();
      rDB1();

      pSave1.then(wordList => {
        assert.deepEqual(wordList, ['Apple', 'apply', 'Banana']);

        done();
      }, done);
    });
  });
});
