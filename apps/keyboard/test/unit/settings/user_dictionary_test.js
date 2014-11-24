'use strict';

/* global MockPromise, PromiseStorage, UserDictionary */

require('/shared/test/unit/mocks/mock_promise.js');
require('/js/shared/promise_storage.js');

require('/js/settings/user_dictionary.js');

suite('UserDictionary', function() {
  var model;
  var stubPromiseStorage;

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
      this.sinon.stub(model, '_saveList').returns(pSaveList);

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
      this.sinon.stub(model, '_saveList').returns(pSaveList);

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
    this.sinon.stub(model, '_saveList').returns(pSaveList);

    model._wordSet = new Set(['star']);

    var pRet = model.removeWord('star');
    assert.equal(pRet, pSaveList);

    assert.deepEqual(Array.from(model._wordSet), []);
  });

  test('saveList', function() {
    // we test successive three calls to saveList and make sure they're properly
    // queued

    model._wordSet = new Set(['a']);

    var pDB, pRet0, pRet1, pRet2, pRet3;

    pRet0 = model._saveQueue;

    pRet1 = model._saveList();
    assert.equal(pRet1, model._saveQueue);

    pRet2 = model._saveList();
    assert.equal(pRet2, model._saveQueue);

    pRet3 = model._saveList();
    assert.equal(pRet3, model._saveQueue);

    assert.isFalse(model._dbStore.setItem.called);


    pDB = new MockPromise();
    model._dbStore.setItem.returns(pDB);

    var pThen0 = pRet0.mFulfillToValue(undefined);

    assert.isTrue(model._dbStore.setItem.calledOnce);
    assert.isTrue(model._dbStore.setItem.calledWith('wordlist', ['a']));

    assert.equal(pThen0, pDB);


    pDB = new MockPromise();
    model._dbStore.setItem.returns(pDB);

    var pThen1 = pRet1.mFulfillToValue(undefined);

    assert.isTrue(model._dbStore.setItem.calledTwice);
    assert.isTrue(model._dbStore.setItem.calledWith('wordlist', ['a']));

    assert.equal(pThen1, pDB);


    pDB = new MockPromise();
    model._dbStore.setItem.returns(pDB);

    var pThen2 = pRet2.mFulfillToValue(undefined);

    assert.isTrue(model._dbStore.setItem.calledThrice);

    assert.equal(pThen2, pDB);
  });
});
