/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global
  AdapterMock,
  FxSyncWebCrypto,
  Kinto,
  SyncEngine,
  SynctoServerFixture
*/

requireApp('sharedtest/test/unit/sync/sync-engine/adapter-mock.js');
requireApp('sharedtest/test/unit/sync/fixtures/synctoserver.js');
requireApp('sharedtest/test/unit/sync/sync-engine/fxsyncwebcrypto-mock.js');
requireApp('sharedtest/test/unit/sync/sync-engine/kinto-mock.js');
require('/shared/js/sync/engine.js');

var cloneObject = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

suite('SyncEngine', function() {
  suite('constructor', function() {
    test('constructs a SyncEngine object', function(done) {
      const options = SynctoServerFixture.syncEngineOptions;
      const se = new SyncEngine(options);
      expect(se).to.be.an('object');
      expect(se._kB).to.equal(options.kB);
      expect(se._collections).to.be.an('object');
      expect(se._controlCollections).to.be.an('object');
      expect(se._fswc).to.be.instanceOf(FxSyncWebCrypto);
      expect(se._adapters).to.deep.equal(options.adapters);
      expect(se._ready).to.equal(false);
      done();
    });

    test('checks that options is an Object', function(done) {
      try {
        var se = new SyncEngine(5);
      } catch(err) {
        expect(se).to.equal(undefined);
        expect(err.message).to.equal('options should be an Object');
        done();
      }
    });

    ['URL', 'assertion', 'kB'].forEach(field => {
      test(`checks that ${field} is a String`, function(done) {
        var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
        credentials[field] = 7.2;
        try {
          var se = new SyncEngine(credentials);
        } catch(err) {
          expect(se).to.equal(undefined);
          expect(err.message).to.equal(`options.${field} should be a String`);
          done();
        }
      });
    });

    test('checks that options.adapters is an Object', function(done) {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters = 'foo';
      try {
        var se = new SyncEngine(credentials);
      } catch(err) {
        expect(se).to.equal(undefined);
        expect(err.message).to.equal('options.adapters should be an Object');
        done();
      }
    });

    test('checks that options.adapters members are Objects', function(done) {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters = {
        foo: 'bar'
      };
      try {
        var se = new SyncEngine(credentials);
      } catch(err) {
        expect(se).to.equal(undefined);
        expect(err.message).to.equal(
            'options.adapters.foo should be an Object');
        done();
      }
    });

    ['update', 'handleConflict'].forEach(methodName => {
      test(`checks that options.adapters[x].${methodName} are Functions`,
          function(done) {
        var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
        credentials.adapters = {
          foo: AdapterMock()
        };
        credentials.adapters.foo[methodName] = 8;
        try {
          var se = new SyncEngine(credentials);
        } catch(err) {
          expect(se).to.equal(undefined);
          expect(err.message).to.equal(`options.adapters.foo.${methodName} shou\
ld be a Function`);
          done();
        }
      });
    });
  });

   suite('syncNow', function() {
    setup(function() {
      Kinto.setMockProblem();
    });

    test('resolves its promise', function(done) {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      expect(se.syncNow({ history: {} })).to.eventually.
          equal(undefined).and.notify(done);
    });

    test('initializes the Kinto object', function(done) {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      se.syncNow({ history: {} }).then(function() {
        expect(se._kinto).to.be.instanceOf(Kinto);
        expect(se._kinto.options).to.deep.equal({
          bucket: SynctoServerFixture.xClientState,
          remote: SynctoServerFixture.syncEngineOptions.URL,
          timeout: 180 * 1000,
          headers: {
            'Authorization': 'BrowserID ' +
                             SynctoServerFixture.syncEngineOptions.assertion
          }
        });
        done();
      });
    });

    test('sets the correct xClientState as the bucket', function(done) {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      se.syncNow({ history: {} }).then(function() {
        expect(se._kinto.options.bucket).to.equal(
            SynctoServerFixture.xClientState);
        done();
      });
    });

    test('Passes options to the DataAdapter', function(done) {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      se.syncNow({ history: { readonly: true } }).then(function() {
        expect(AdapterMock.options).to.deep.equal({
          readonly: true,
          userid: SynctoServerFixture.xClientState
        });
        done();
      });
    });

    test('Syncs crypto collection only first time', function(done) {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      se.syncNow({ history: {} }).then(() => {
        expect(Kinto.syncCount.meta).to.equal(1);
        expect(Kinto.syncCount.crypto).to.equal(1);
        expect(Kinto.syncCount.history).to.equal(1);
        var se2 = new SyncEngine(SynctoServerFixture.syncEngineOptions);
        return se2.syncNow({ history: {} });
      }).then(() => {
        expect(Kinto.syncCount.meta).to.equal(2);
        expect(Kinto.syncCount.crypto).to.equal(1);
        expect(Kinto.syncCount.history).to.equal(2);
        done();
      });
    });

    test('retrieves and decrypts the remote data', function(done) {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      se.syncNow({ history: {} }).then(() => {
        expect(se._collections.history).to.be.an('object');
        return se._collections.history.list();
      }).then(list => {
        expect(list).to.be.an('object');
        expect(list.data).to.be.instanceOf(Array);
        expect(list.data.length).to.equal(1);
        expect(Object.keys(list.data[0]).sort())
          .to.deep.equal(['id', 'last_modified', 'payload']);
        expect(list.data[0].payload).to.be.an('object');
        expect(list.data[0].payload.histUri).to.be.a('string');
        done();
      });
    });

    test('encrypts and pushes added records', function(done) {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('create', [
        { payload: 'foo' }
      ]);
      var se = new SyncEngine(credentials);
      se.syncNow({ history: {} }).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(2);
        expect(se._collections.history.pushData.length).to.equal(2);
        expect(list.data[0].payload.histUri).to.be.a('string');
        expect(list.data[1].payload).to.equal('foo');
        expect(se._collections.history.pushData[1].payload).to.equal(
           '{"mockEncrypted":"\\"foo\\""}');
        done();
      });
    });

    test('enforces FxSyncIdSchema on added records', function(done) {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('create', [
        { payload: 'foo' },
        { forceId: 8.4 }
      ]);

      var se = new SyncEngine(credentials);
      expect(se.syncNow({ history: {} })).to.be.rejectedWith(Error, `Invalid id\
: 8.4`).and.notify(done);
    });

    test('encrypts and pushes updated records', function(done) {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('update', [ {
        id: SynctoServerFixture.remoteData.history.id,
        payload: 'foo'
      }]);

      var se = new SyncEngine(credentials);
      se.syncNow({ 'history': {} }).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(1);
        expect(se._collections.history.pushData.length).to.equal(1);
        expect(se._collections.history.pushData[0].payload).to.equal(
            '{"mockEncrypted":"\\"foo\\""}');
        done();
      });
    });

    test('only uploads encrypted payload and id', function(done) {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('update', [ {
        id: SynctoServerFixture.remoteData.history.id,
        payload: 'foo',
        strayField: 'bar'
      }]);

      var se = new SyncEngine(credentials);
      se.syncNow({ history: {} }).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(1);
        expect(Object.keys(se._collections.history.pushData[0]).sort())
          .to.deep.equal(['id', 'payload']);
        done();
      });
    });


    test('pushes deletes of records', function(done) {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('delete', [
        SynctoServerFixture.remoteData.history.id
      ]);

      var se = new SyncEngine(credentials);
      se.syncNow({ history: {} }).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(0);
        expect(se._collections.history.pushData.length).to.equal(0);
        done();
      });
    });

    test('encrypts and pushes conflict resolutions', function(done) {
      Kinto.setMockProblem({ collectionName: 'history', problem: 'conflicts' });
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      se.syncNow({ history: {} }).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(1);
        expect(list.data[0].bar).to.equal('local');
        expect(se._collections.history.pushData[0].payload).to.equal('{}');
        Kinto.setMockProblem();
        done();
      });
    });

    test('does not push if nothing changed', function(done) {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('noop', [ {
        id: SynctoServerFixture.remoteData.history.id,
        foo: 'bar'
      }]);

      var se = new SyncEngine(credentials);
      se.syncNow({ 'history': {} }).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(1);
        expect(se._collections.history.pushData.length).to.equal(0);
        done();
      });
    });

    test(`rejects its promise if collectionOptions is not an object`,
        function(done) {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      expect(se.syncNow('foo')).to.be.rejectedWith(Error, `collectionOptions sh\
ould be an object`).and.notify(done);
    });

    ['URL', 'assertion', 'kB'].forEach(function(field) {
      test(`rejects its promise if ${field} is wrong`, function(done) {
        var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
        credentials.adapters = {
          history: AdapterMock()
        };
        credentials[field] = 'whoopsie';
        var se = new SyncEngine(credentials);
        se.syncNow({ history: {} }).catch(err => {
          if (field === 'assertion') {
            expect(err).to.be.instanceOf(SyncEngine.AuthError);
          } else if (field === 'URL') {
            expect(err).to.be.instanceOf(SyncEngine.TryLaterError);
          } else {
            expect(err).to.equal(`SyncKeys hmac could not be verified with curr\
ent main key`);
          }
          done();
        });
      });
    });

    ['meta', 'crypto'].forEach(function(collectionName) {
      [
        '401',
        '404',
        '500',
        '503',
        'wrong-payload-meta',
        'wrong-payload-crypto',
        'wrong-ciphertext',
        'wrong-id'
      ].forEach(function(problem) {
        test(`rejects its promise if ${collectionName} response is ${problem}`,
            function(done) {
          Kinto.setMockProblem({ collectionName, problem });
          var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
          se.syncNow({ history: {} }).catch(err => {
            if (problem === '401') {
              expect(err.message).to.equal('unauthorized');
            } else if (['404', '500', '503'].indexOf(problem) !== -1) {
              expect(err.message).to.equal('try later');
            } else {
              expect(err.message).to.equal('unrecoverable');
            }
            done();
          });
        });
      });
    });

    [
      '401',
      '404',
      '500',
      '503',
      'wrong-payload-history',
      'wrong-ciphertext',
      'wrong-id'
    ].forEach(function(problem) {
      test(`rejects its promise if response is ${problem}`, function(done) {
        Kinto.setMockProblem({ collectionName:'history', problem });

        var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
        se.syncNow({ history: {} }).catch(err => {
          if (problem === '401') {
            expect(err.message).to.equal('unauthorized');
          } else if (['404', '500', '503'].indexOf(problem) !== -1) {
            expect(err.message).to.equal('try later');
          } else {
            expect(err.message).to.equal('unrecoverable');
          }
          if (['401', '404', '500', '503'].indexOf(problem) === -1) {
            expect(Kinto.clearCalled).to.equal(true);
          } else {
            expect(Kinto.clearCalled).to.equal(false);
          }
          done();
        });
      });
    });
  });
});
