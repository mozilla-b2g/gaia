'use strict';

/* global DatabasePromiseManager, MockIDBFactory, MockIDBDatabase,
          MockPromise */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/test/unit/mock_indexeddb.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/js/settings/database_promise_manager.js');

suite('DatabasePromiseManager', function() {
  var database;

  var mockIndexedDB;
  var stubIDB;

  var p;
  setup(function() {
    mockIndexedDB = new MockIDBFactory();
    this.sinon.spy(mockIndexedDB, 'open');

    MockIDBFactory.attachToWindow(mockIndexedDB);

    this.sinon.stub(window, 'Promise', MockPromise);
    this.sinon.spy(window.Promise, 'all');

    database = new DatabasePromiseManager();
    database.start();

    p = window.Promise.firstCall.returnValue;
  });

  teardown(function() {
    MockIDBFactory.restore();
  });

  suite('open database', function() {
    test('error', function(done) {
      p.mExecuteCallback(function resolve() {
        assert.isTrue(false, 'should not resolve');
        done();
      }, function reject(err) {
        assert.equal(err, 'Unknown error');
        p.mRejectToError(err);
        done();
      });

      var openReq = mockIndexedDB.open.firstCall.returnValue;
      openReq.error = 'Unknown error';
      openReq.readyState = 'done';
      openReq.dispatchEvent({
        type: 'error',
        target: openReq
      });
    });

    test('upgradedneeded (0 -> 1)', function() {
      p.mExecuteCallback(function resolve() {
        assert.isTrue(false, 'should not resolve');
      }, function reject(err) {
        assert.isTrue(false, 'should not reject');
      });

      stubIDB = new MockIDBDatabase({
        name: database.DB_NAME,
        verstion: 0
      });
      this.sinon.spy(stubIDB, 'createObjectStore');

      var openReq = mockIndexedDB.open.firstCall.returnValue;
      openReq.result = stubIDB;
      openReq.readyState = 'done';
      openReq.dispatchEvent({
        type: 'upgradeneeded',
        target: openReq,
        oldVersion: 0,
        newVersion: 1
      });

      assert.isTrue(stubIDB.createObjectStore.calledWith(database.STORE_NAME));
    });

    test('success', function(done) {
      p.mExecuteCallback(function resolve(db) {
        assert.equal(db, stubIDB);

        done();
      }, function reject(err) {
        assert.isTrue(false, 'should not reject');

        done();
      });

      stubIDB = new MockIDBDatabase({
        name: database.DB_NAME,
        verstion: 1
      });

      var openReq = mockIndexedDB.open.firstCall.returnValue;
      openReq.result = stubIDB;
      openReq.readyState = 'done';
      openReq.dispatchEvent({
        type: 'success',
        target: openReq
      });
    });

    suite('operations', function() {
      var txn, store;
      setup(function() {
        var mOptions = {
          name: database.DB_NAME,
          verstion: 1,
          objectStoreNames: [database.STORE_NAME]
        };

        stubIDB = new MockIDBDatabase(mOptions);
        txn = stubIDB.transaction(database.STORE_NAME);
        store = txn.objectStore(database.STORE_NAME);
        this.sinon.spy(store, 'get');
        this.sinon.spy(store, 'put');
        this.sinon.spy(store, 'delete');

        this.sinon.stub(stubIDB, 'transaction').returns(txn);
        this.sinon.stub(txn, 'objectStore').returns(store);
      });

      test('getItem', function(done) {
        var data = {};

        var pReturned = database.getItem('foo');

        var val = p.mFulfillToValue(stubIDB);
        assert.isTrue(stubIDB.transaction.calledWith(database.STORE_NAME));
        assert.equal(val, txn);

        var p1 = p.mGetNextPromise();
        var p1_0 = p1.mFulfillToValue(txn);
        assert.equal(p1_0, window.Promise.secondCall.returnValue);

        p1_0.mExecuteCallback(function resolve(d) {
          assert.equal(d, data, 'should resolve to data');
          var p2 = p1.mGetNextPromise();
          assert.equal(p2.catch.firstCall.returnValue, pReturned,
            'return promise is chained');

          done();
        }, function reject() {
          assert.isTrue(false, 'should not reject');
          done();
        });

        assert.isTrue(store.get.calledWith('foo'));
        var req = store.get.firstCall.returnValue;
        req.readyState = 'done';
        req.result = data;
        req.dispatchEvent({
          type: 'success',
          target: req
        });
        txn.dispatchEvent({
          type: 'complete',
          target: txn
        });
      });

      test('getItems', function() {
        var data = [{}, {}];

        var pReturned = database.getItems(['foo', 'foo2']);
        var val = p.mFulfillToValue(stubIDB);
        assert.isTrue(stubIDB.transaction.calledWith(database.STORE_NAME));
        assert.equal(val, txn);

        var p1 = p.mGetNextPromise();
        var p1_0 = p1.mFulfillToValue(txn);

        var resolved1 = false;
        window.Promise.getCall(1).returnValue
        .mExecuteCallback(function resolve(d) {
          resolved1 = true;
          assert.equal(d, data[0], 'should resolve to data');
        }, function reject() {
          assert.isTrue(false, 'should not reject');
        });

        assert.isTrue(store.get.calledWith('foo'));
        var req = store.get.firstCall.returnValue;
        req.readyState = 'done';
        req.result = data[0];
        req.dispatchEvent({
          type: 'success',
          target: req
        });

        assert.isTrue(resolved1);

        var resolved2 = false;
        window.Promise.getCall(2).returnValue
        .mExecuteCallback(function resolve(d) {
          resolved2 = true;
          assert.equal(d, data[1], 'should resolve to data');
        }, function reject() {
          assert.isTrue(false, 'should not reject');
        });

        assert.isTrue(store.get.calledWith('foo2'));
        var req2 = store.get.secondCall.returnValue;
        req2.readyState = 'done';
        req2.result = data[1];
        req2.dispatchEvent({
          type: 'success',
          target: req2
        });

        assert.isTrue(resolved2);

        var resolved3;
        window.Promise.getCall(3).returnValue
        .mExecuteCallback(function resolve(pAll) {
          resolved3 = true;
          assert.equal(pAll, window.Promise.all.firstCall.returnValue,
            'should return promise return from all()');

          var pAllArgs = window.Promise.all.firstCall.args;
          assert.equal(pAllArgs[0][0], window.Promise.getCall(1).returnValue,
            'all() should be called with array of promises');
          assert.equal(pAllArgs[0][1], window.Promise.getCall(2).returnValue,
            'all() should be called with array of promises');
        }, function reject() {
          assert.isTrue(false, 'should not reject');
        });

        txn.dispatchEvent({
          type: 'complete',
          target: txn
        });

        assert.isTrue(resolved3);
        assert.equal(p1_0, window.Promise.getCall(3).returnValue);

        var p2 = p1.mGetNextPromise();
        assert.equal(p2.catch.firstCall.returnValue, pReturned,
          'return promise is chained');
      });

      test('setItem', function(done) {
        var data = {};

        var pReturned = database.setItem('foo', data);

        var val = p.mFulfillToValue(stubIDB);
        assert.isTrue(
          stubIDB.transaction.calledWith(database.STORE_NAME, 'readwrite'));
        assert.equal(val, txn);

        var p1 = p.mGetNextPromise();
        var p1_0 = p1.mFulfillToValue(txn);
        assert.equal(p1_0, window.Promise.secondCall.returnValue);

        p1_0.mExecuteCallback(function resolve(d) {
          assert.equal(d, undefined, 'should resolve to undefined');
          var p2 = p1.mGetNextPromise();
          assert.equal(p2.catch.firstCall.returnValue, pReturned,
            'return promise is chained');

          done();
        }, function reject() {
          assert.isTrue(false, 'should not reject');
          done();
        });

        assert.isTrue(store.put.calledWith(data, 'foo'));
        var req = store.put.firstCall.returnValue;
        req.readyState = 'done';
        req.result = ''; // XXX should be something else
        req.dispatchEvent({
          type: 'success',
          target: req
        });
        txn.dispatchEvent({
          type: 'complete',
          target: txn
        });
      });

      test('deleteItem', function(done) {
        var pReturned = database.deleteItem('foo');

        var val = p.mFulfillToValue(stubIDB);
        assert.isTrue(
          stubIDB.transaction.calledWith(database.STORE_NAME, 'readwrite'));
        assert.equal(val, txn);

        var p1 = p.mGetNextPromise();
        var p1_0 = p1.mFulfillToValue(txn);
        assert.equal(p1_0, window.Promise.secondCall.returnValue);

        p1_0.mExecuteCallback(function resolve(d) {
          assert.equal(d, undefined, 'should resolve to undefined');
          var p2 = p1.mGetNextPromise();
          assert.equal(p2.catch.firstCall.returnValue, pReturned,
            'return promise is chained');

          done();
        }, function reject() {
          assert.isTrue(false, 'should not reject');
          done();
        });

        assert.isTrue(store.delete.calledWith('foo'));
        var req = store.delete.firstCall.returnValue;
        req.readyState = 'done';
        req.result = ''; // XXX should be something else
        req.dispatchEvent({
          type: 'success',
          target: req
        });
        txn.dispatchEvent({
          type: 'complete',
          target: txn
        });
      });
    });
  });
});
