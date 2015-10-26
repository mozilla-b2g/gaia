'use strict';

/* global InputMethodDatabaseLoader, InputMethodDatabaseConfig,
          PromiseStorage */

require('/js/shared/promise_storage.js');
require('/js/keyboard/input_method_database_loader.js');

suite('InputMethodDatabaseConfig', function() {
  var config;

  suite('With config', function() {
    var fakeXhr;

    suite('Fully preloaded config', function() {
      setup(function() {
        var requests = [];

        fakeXhr = sinon.useFakeXMLHttpRequest();
        fakeXhr.onCreate = function(request) {
          requests.push(request);
        };

        config = new InputMethodDatabaseConfig();
        config.start();

        assert.equal(requests.length, 1);

        var request = requests[0];
        assert.equal(request.url, config.CONFIG_FILE_PATH);
        assert.equal(request.responseType, 'json');
        request.response = [
          {
            'id': 'en',
            'name': 'English',
            'imEngineId': 'latin',
            'preloaded': true,
            'dictFilename': 'en_us.dict',
            'dictFilePath': 'dictionaries/en_us.dict',
            'dictFileSize': 1451400,
            'types': ['email', 'password', 'text',  'url']
          },
          {
            'id': 'es',
            'name': 'Español',
            'imEngineId': 'latin',
            'preloaded': true,
            'dictFilename': 'es.dict',
            'dictFilePath': 'dictionaries/es.dict',
            'dictFileSize': 1564842,
            'types': ['email', 'password', 'text',  'url']
          }
        ];

        request.respond(200, {}, '');
      });

      teardown(function() {
        config.stop();
        config = null;

        fakeXhr.restore();
      });

      test('isAllDataPreloaded', function(done) {
        config.isAllDataPreloaded().then(function(val) {
          assert.ok(val, 'preload=true.');
        }, function(e) {
          throw e || 'Should not reject.';
        }).then(done, done);
      });
    });

    suite('Partly preloaded config', function() {
      setup(function() {
        var requests = [];

        fakeXhr = sinon.useFakeXMLHttpRequest();
        fakeXhr.onCreate = function(request) {
          requests.push(request);
        };

        config = new InputMethodDatabaseConfig();
        config.start();

        assert.equal(requests.length, 1);

        var request = requests[0];
        assert.equal(request.url, config.CONFIG_FILE_PATH);
        assert.equal(request.responseType, 'json');
        request.response = [
          {
            'id': 'en',
            'name': 'English',
            'imEngineId': 'latin',
            'preloaded': true,
            'dictFilename': 'en_us.dict',
            'dictFilePath': 'dictionaries/en_us.dict',
            'dictFileSize': 1451400,
            'types': ['email', 'password', 'text',  'url']
          },
          {
            'id': 'es',
            'name': 'Español',
            'imEngineId': 'latin',
            'preloaded': false,
            'dictFilename': 'es.dict',
            'dictFilePath': 'dictionaries/es.dict',
            'dictFileSize': 1564842,
            'types': ['email', 'password', 'text',  'url']
          }
        ];

        request.respond(200, {}, '');
      });

      teardown(function() {
        config.stop();
        config = null;

        fakeXhr.restore();
      });

      test('isDataPreloaded=true (unlisted)', function(done) {
        config.isDataPreloaded('latin', 'dictionaries/foo.dict')
          .then(function(val) {
            assert.ok(val);
          }, function(e) {
            throw e || 'Should not reject.';
          })
          .then(done, done);
      });

      test('isDataPreloaded=true', function(done) {
        config.isDataPreloaded('latin', 'dictionaries/en_us.dict')
          .then(function(val) {
            assert.ok(val);
          }, function(e) {
            throw e || 'Should not reject.';
          })
          .then(done, done);
      });

      test('isDataPreloaded=false', function(done) {
        config.isDataPreloaded('latin', 'dictionaries/es.dict')
          .then(function(val) {
            assert.isFalse(val);
          }, function(e) {
            throw e || 'Should not reject.';
          })
          .then(done, done);
      });

      test('isAllDataPreloaded', function(done) {
        config.isAllDataPreloaded().then(function(val) {
          assert.isFalse(val, 'preload=false.');
        }, function(e) {
          throw e || 'Should not reject.';
        }).then(done, done);
      });
    });
  });

  suite('Without config', function() {
    setup(function() {
      config = new InputMethodDatabaseConfig();
      config.CONFIG_FILE_PATH = '404.json';
      config.start();
    });

    teardown(function() {
      config.stop();
      config = null;
    });

    test('isDataPreloaded', function(done) {
      config.isDataPreloaded('foo', 'bar').then(function(val) {
        assert.ok(val, 'preload=true without config file.');
      }, function(e) {
        throw e || 'Should not reject.';
      }).then(done, done);
    });

    test('isAllDataPreloaded', function(done) {
      config.isAllDataPreloaded().then(function(val) {
        assert.ok(val, 'preload=true without config file.');
      }, function(e) {
        throw e || 'Should not reject.';
      }).then(done, done);
    });
  });
});

suite('InputMethodDatabaseLoader', function() {
  var promiseStorageStub;

  var loader;

  setup(function() {
    promiseStorageStub =
      this.sinon.stub(Object.create(PromiseStorage.prototype));
    this.sinon.stub(window, 'PromiseStorage').returns(promiseStorageStub);
  });

  suite('Without config', function() {
    setup(function() {
      loader = new InputMethodDatabaseLoader();
      // Use absolute path here.
      loader.SOURCE_DIR = '/js/imes/';
      loader.start();
    });

    teardown(function() {
      loader.stop();
      loader = null;
    });

    test('load data from package', function(done) {
      loader.load('latin', 'dictionaries/en_us.dict').then(function(data) {
        assert.equal(data && data.byteLength, 1451400, 'Got data');
      }, function(e) {
        if (e) { throw e; }
        throw 'Should not reject';
      }).then(done, done);
    });

    test('load data from package (non-exist path)', function(done) {
      loader.load('latin', 'dictionaries/404.dict').then(function(data) {
        assert.isTrue(false, 'Should not resolve');
      }, function() {
        assert.isTrue(true, 'Rejected');
      }).then(done, done);
    });
  });

  suite('With config', function() {
    var fakeXhr;

    suite('Fully preloaded config', function() {
      setup(function() {
        var requests = [];

        fakeXhr = sinon.useFakeXMLHttpRequest();
        fakeXhr.onCreate = function(request) {
          requests.push(request);
        };

        loader = new InputMethodDatabaseLoader();
        // Use absolute path here.
        loader.SOURCE_DIR = '/js/imes/';
        loader.start();

        assert.equal(requests.length, 1);

        var request = requests[0];
        request.response = [
          {
            'id': 'en',
            'name': 'English',
            'imEngineId': 'latin',
            'preloaded': true,
            'dictFilename': 'en_us.dict',
            'dictFilePath': 'dictionaries/en_us.dict',
            'dictFileSize': 1451400,
            'types': ['email', 'password', 'text',  'url']
          },
          {
            'id': 'es',
            'name': 'Español',
            'imEngineId': 'latin',
            'preloaded': true,
            'dictFilename': 'es.dict',
            'dictFilePath': 'dictionaries/es.dict',
            'dictFileSize': 1564842,
            'types': ['email', 'password', 'text',  'url']
          }
        ];

        request.respond(200, {}, '');

        // Restore here so that we can use the real XHR to get en_us.dict.
        fakeXhr.restore();
      });

      teardown(function() {
        assert.isFalse(window.PromiseStorage.called,
          'PromiseStorage is not initialized.');

        loader.stop();
        loader = null;
      });

      test('load data from package', function(done) {
        loader.load('latin', 'dictionaries/en_us.dict').then(function(data) {
          assert.equal(data && data.byteLength, 1451400, 'Got data');
        }, function(e) {
          if (e) { throw e; }
          throw 'Should not reject';
        }).then(done, done);
      });
    });

    suite('Partly preloaded config', function() {
      setup(function() {
        var requests = [];

        fakeXhr = sinon.useFakeXMLHttpRequest();
        fakeXhr.onCreate = function(request) {
          requests.push(request);
        };

        loader = new InputMethodDatabaseLoader();
        // Use absolute path here.
        loader.SOURCE_DIR = '/js/imes/';
        loader.start();

        assert.equal(requests.length, 1);

        var request = requests[0];
        request.response = [
          {
            'id': 'en',
            'name': 'English',
            'imEngineId': 'latin',
            'preloaded': true,
            'dictFilename': 'en_us.dict',
            'dictFilePath': 'dictionaries/en_us.dict',
            'dictFileSize': 1451400,
            'types': ['email', 'password', 'text',  'url']
          },
          {
            'id': 'es',
            'name': 'Español',
            'imEngineId': 'latin',
            'preloaded': false,
            'dictFilename': 'es.dict',
            'dictFilePath': 'dictionaries/es.dict',
            'dictFileSize': 1564842,
            'types': ['email', 'password', 'text',  'url']
          }
        ];

        request.respond(200, {}, '');

        // Restore here so that we can use the real XHR to get en_us.dict.
        fakeXhr.restore();
      });

      teardown(function() {
        assert.ok(window.PromiseStorage.calledWith(loader.DATABASE_NAME));

        loader.stop();
        loader = null;
      });

      test('load data from package', function(done) {
        loader.load('latin', 'dictionaries/en_us.dict').then(function(data) {
          assert.equal(data && data.byteLength, 1451400, 'Got data');
        }, function(e) {
          if (e) { throw e; }
          throw 'Should not reject';
        }).then(done, done);
      });

      test('load data from PromiseStorage', function(done) {
        promiseStorageStub.getItem.returns(Promise.resolve({ stub: 'esDict '}));

        loader.load('latin', 'dictionaries/es.dict').then(function(data) {
          assert.deepEqual(data, { stub: 'esDict '}, 'Got data');
          assert.ok(promiseStorageStub.getItem.calledWith(
            'latin/dictionaries/es.dict'));

        }, function(e) {
          if (e) { throw e; }
          throw 'Should not reject';
        }).then(done, done);
      });
    });
  });
});
