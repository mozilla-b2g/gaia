/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  AdapterMock,
  expect,
  FxSyncWebCrypto,
  Kinto,
  requireApp,
  suite,
  SyncEngine,
  SynctoServerFixture,
  test
*/

requireApp('sync/test/unit/sync-engine/adapter-mock.js');
requireApp('sync/test/unit/fixtures/synctoserver.js');
requireApp('sync/test/unit/sync-engine/fxsyncwebcrypto-mock.js');
requireApp('sync/test/unit/sync-engine/kinto-mock.js');
requireApp('sync/js/sync-engine/syncengine.js');

var cloneObject = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

suite('SyncEngine', () => {
  suite('constructor', () => {
    test('constructs a SyncEngine object', done => {
      const options = SynctoServerFixture.syncEngineOptions;
      const se = new SyncEngine(options);
      expect(se).to.be.an('object');
      expect(se._kB).to.equal(options.kB);
      expect(se._collections).to.be.an('object');
      expect(se._controlCollections).to.be.an('object');
      expect(se._fswc).to.be.instanceOf(FxSyncWebCrypto);
      expect(se._kinto).to.be.instanceOf(Kinto);
      expect(se._adapters).to.deep.equal(options.adapters);
      expect(se._ready).to.equal(false);
      done();
    });

    test('checks that options is an Object', done => {
      try {
        var se = new SyncEngine(5);
      } catch(err) {
        expect(se).to.equal(undefined);
        expect(err.message).to.equal('options should be an Object');
        done();
      }
    });

    ['URL', 'assertion', 'xClientState', 'kB'].forEach(field => {
      test(`checks that ${field} is a String`, done => {
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

    test('checks that options.adapters is an Object', done => {
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

    test('checks that options.adapters members are Objects', done => {
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
          done => {
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

  suite('syncNow', () => {
    test('resolves its promise', done =>  {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      expect(se.syncNow([ 'history' ])).to.eventually.deep.
          equal([ undefined ]).and.notify(done);
    });

    test('retrieves and decrypts the remote data', done => {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      se.syncNow([ 'history' ]).then(() => {
        expect(se._collections.history).to.be.an('object');
        return se._collections.history.list();
      }).then(list => {
        expect(list).to.be.an('object');
        expect(list.data).to.be.instanceOf(Array);
        expect(list.data.length).to.equal(1);
        expect(list.data[0]).to.be.an('object');
        expect(list.data[0].payload).to.be.an('object');
        expect(list.data[0].payload.histUri).to.be.a('string');
        done();
      });
    });

    test('encrypts and pushes added records', done => {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('create', [
        { foo: 'bar' }
      ]);
      var se = new SyncEngine(credentials);
      se.syncNow([ 'history' ]).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(2);
        expect(se._collections.history.pushData.length).to.equal(2);
        expect(list.data[0].payload.histUri).to.be.a('string');
        expect(list.data[1].payload.foo).to.equal('bar');
        done();
      });
    });

    test('enforces FxSyncIdSchema on added records', done => {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('create', [
        { foo: 'bar' },
        { forceId: 'wrong' }
      ]);

      var se = new SyncEngine(credentials);
      expect(se.syncNow([ 'history' ])).to.be.rejectedWith(Error, `Invalid id: \
wrong`).and.notify(done);
    });

    test('encrypts and pushes updated records', done => {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('update', [ {
        id: SynctoServerFixture.remoteData.history.id,
        foo: 'bar'
      }]);

      var se = new SyncEngine(credentials);
      se.syncNow([ 'history' ]).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(1);
        expect(se._collections.history.pushData.length).to.equal(1);
        expect(list.data[0].foo).to.be.a('string');
        done();
      });
    });

    test('pushes deletes of records', done => {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters.history = AdapterMock('delete', [
        SynctoServerFixture.remoteData.history.id
      ]);

      var se = new SyncEngine(credentials);
      se.syncNow([ 'history' ]).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(0);
        expect(se._collections.history.pushData.length).to.equal(0);
        done();
      });
    });
    test('encrypts and pushes conflict resolutions', done => {
      var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
      credentials.adapters = {
        history: AdapterMock()
      };
      credentials.xClientState = `history conflicts`;
      var se = new SyncEngine(credentials);
      se.syncNow([ 'history' ]).then(() => {
        return se._collections.history.list();
      }).then(list => {
        expect(list.data.length).to.equal(1);
        expect(list.data[0].bar).to.equal('local');
        expect(se._collections.history.pushData[0].payload).to.equal('{}');
        done();
      });
    });

    test(`rejects its promise if collections is not an Array`, done => {
      var se = new SyncEngine(SynctoServerFixture.syncEngineOptions);
      expect(se.syncNow('foo')).to.be.rejectedWith(Error, `collectionNames shou\
ld be an Array`).and.notify(done);
    });

    ['URL', 'assertion', 'xClientState', 'kB'].forEach(field => {
      test(`rejects its promise if ${field} is wrong`, done => {
        var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
        credentials.adapters = {
          history: AdapterMock()
        };
        credentials[field] = 'whoopsie';
        var se = new SyncEngine(credentials);
        se.syncNow([ 'history' ]).catch(err => {
          if (['assertion', 'xClientState'].indexOf(field) !== -1) {
            expect(err).to.be.instanceOf(SyncEngine.AuthError);
          } else {
            expect(err).to.be.instanceOf(SyncEngine.UnrecoverableError);
          }
          done();
        });
      });
    });

    ['meta', 'crypto'].forEach(collectionName => {
      [
        '401',
        '404',
        '500',
        '503',
        'wrong-payload-meta',
        'wrong-payload-crypto',
        'wrong-ciphertext',
        'wrong-id'
      ].forEach(problem => {
        test(`rejects its promise if ${collectionName} response is ${problem}`,
            done => {
          var credentials = cloneObject(SynctoServerFixture.syncEngineOptions);
          credentials.adapters = {
            history: AdapterMock()
          };
          credentials.xClientState = `${collectionName} ${problem}`;
          var se = new SyncEngine(credentials);
          se.syncNow([ 'history' ]).catch(err => {
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
    ].forEach(problem => {
      test(`rejects its promise if response is ${problem}`, done => {
        var options = {
          URL: SynctoServerFixture.syncEngineOptions.URL,
          assertion: SynctoServerFixture.syncEngineOptions.assertion,
          xClientState: `history ${problem}`,
          kB: SynctoServerFixture.syncEngineOptions.kB,
          adapters: {
            history: AdapterMock()
          }
        };
        var se = new SyncEngine(options);
        se.syncNow([ 'history' ]).catch(err => {
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
});
