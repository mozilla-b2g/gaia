'use strict';

/* global PromiseStorage, MockIDBFactory, MockIDBDatabase */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/test/unit/mock_indexeddb.js');

require('/js/shared/promise_storage.js');

suite('PromiseStorage', function() {
  var name;
  var storage;

  var mockIndexedDB;
  var stubIDB;

  var p;
  setup(function() {
    name = 'storage';

    mockIndexedDB = new MockIDBFactory();
    this.sinon.spy(mockIndexedDB, 'open');

    MockIDBFactory.attachToWindow(mockIndexedDB);

    storage = new PromiseStorage(name);
    p = storage.start();
  });

  suite('open database', function() {
    test('error', function(done) {
      var openReq = mockIndexedDB.open.firstCall.returnValue;
      openReq.error = new Error('Mocked error');
      openReq.readyState = 'done';
      openReq.dispatchEvent({
        type: 'error',
        target: openReq
      });

      p.then(function() {
          assert.isTrue(false, 'should not resolve');
        }, function reject(err) {
          assert.strictEqual(err.message, 'Mocked error');
        })
        .then(done, done);
    });

    test('upgradedneeded (0 -> 1)', function() {
      stubIDB = new MockIDBDatabase({
        name: storage.name,
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

      assert.isTrue(stubIDB.createObjectStore.calledWith(storage.STORE_NAME));
    });

    test('success', function(done) {
      stubIDB = new MockIDBDatabase({
        name: storage.DB_NAME,
        verstion: 1
      });

      var openReq = mockIndexedDB.open.firstCall.returnValue;
      openReq.result = stubIDB;
      openReq.readyState = 'done';
      openReq.dispatchEvent({
        type: 'success',
        target: openReq
      });

      p.then(function() {
          assert.isTrue(true, 'resolved');
        }, function reject(err) {
          assert.isTrue(false, 'should not reject');
        })
        .then(done, done);
    });

    suite('operations', function() {
      var txn, store;
      setup(function() {
        var mOptions = {
          name: storage.DB_NAME,
          verstion: 1,
          objectStoreNames: [storage.STORE_NAME]
        };

        stubIDB = new MockIDBDatabase(mOptions);
        txn = stubIDB.transaction(storage.STORE_NAME);
        store = txn.objectStore(storage.STORE_NAME);
        this.sinon.spy(store, 'get');
        this.sinon.spy(store, 'put');
        this.sinon.spy(store, 'delete');

        this.sinon.stub(stubIDB, 'transaction').returns(txn);
        this.sinon.stub(txn, 'objectStore').returns(store);

        var openReq = mockIndexedDB.open.firstCall.returnValue;
        openReq.result = stubIDB;
        openReq.readyState = 'done';
        openReq.dispatchEvent({
          type: 'success',
          target: openReq
        });
      });

      test('getItem', function(done) {
        var data = {};

        var pReturned = storage.getItem('foo');

        p.then(function() {
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

            return pReturned;
          })
          .then(function(d) {
            assert.strictEqual(d, data, 'should resolve to data');
          })
          .then(done, done);
      });

      test('getItems', function(done) {
        var data = [{}, {}];

        var pReturned = storage.getItems(['foo', 'foo2']);

        p.then(function() {
            assert.isTrue(store.get.firstCall.calledWith('foo'));
            assert.isTrue(store.get.getCall(1).calledWith('foo2'));

            var req = store.get.firstCall.returnValue;
            req.readyState = 'done';
            req.result = data[0];
            req.dispatchEvent({
              type: 'success',
              target: req
            });
            txn.dispatchEvent({
              type: 'complete',
              target: txn
            });

            var req1 = store.get.getCall(1).returnValue;
            req1.readyState = 'done';
            req1.result = data[1];
            req1.dispatchEvent({
              type: 'success',
              target: req1
            });
            txn.dispatchEvent({
              type: 'complete',
              target: txn
            });

            return pReturned;
          })
          .then(function(d) {
            assert.strictEqual(d[0], data[0], 'should resolve to data');
            assert.strictEqual(d[1], data[1], 'should resolve to data');
          })
          .then(done, done);
      });

      test('setItem', function(done) {
        var data = {};

        var pReturned = storage.setItem('foo', data);

        p.then(function() {
            assert.isTrue(
              stubIDB.transaction.calledWith(storage.STORE_NAME, 'readwrite'));
            assert.isTrue(store.put.calledWith(data, 'foo'));
            var req = store.put.firstCall.returnValue;
            req.readyState = 'done';
            req.result = 'foo';
            req.dispatchEvent({
              type: 'success',
              target: req
            });
            txn.dispatchEvent({
              type: 'complete',
              target: txn
            });

            return pReturned;
          })
          .then(function(k) {
            assert.equal(k, 'foo');
          })
          .then(done, done);
      });

      test('setItems', function(done) {
        var data = [{}, {}];

        var pReturned = storage.setItems({
          foo: data[0],
          foo2: data[1]
        });

        p.then(function() {
            assert.isTrue(
              stubIDB.transaction.calledWith(storage.STORE_NAME, 'readwrite'));
            assert.isTrue(store.put.firstCall.calledWith(data[0], 'foo'));
            assert.isTrue(store.put.getCall(1).calledWith(data[1], 'foo2'));
            var req = store.put.firstCall.returnValue;
            req.readyState = 'done';
            req.result = 'foo';
            req.dispatchEvent({
              type: 'success',
              target: req
            });
            txn.dispatchEvent({
              type: 'complete',
              target: txn
            });

            var req1 = store.put.getCall(1).returnValue;
            req1.readyState = 'done';
            req1.result = 'foo2';
            req1.dispatchEvent({
              type: 'success',
              target: req1
            });
            txn.dispatchEvent({
              type: 'complete',
              target: txn
            });

            return pReturned;
          })
          .then(function(k) {
            assert.deepEqual(k, ['foo', 'foo2']);
          })
          .then(done, done);
      });

      test('deleteItem', function(done) {
        var pReturned = storage.deleteItem('foo');

        p.then(function() {
            assert.isTrue(
              stubIDB.transaction.calledWith(storage.STORE_NAME, 'readwrite'));
            assert.isTrue(store.delete.calledWith('foo'));
            var req = store.delete.firstCall.returnValue;
            req.readyState = 'done';
            req.result = undefined;
            req.dispatchEvent({
              type: 'success',
              target: req
            });
            txn.dispatchEvent({
              type: 'complete',
              target: txn
            });

            return pReturned;
          })
          .then(function(k) {
            assert.equal(k, undefined);
          })
          .then(done, done);
      });
    });
  });
});
