/*global requirejs, define, TestUrlResolver */
// Test config. mail_app.js has the non-test, runtime config
(function(global) {
  var contextIdCount = 0;
  var baseConfig = {
    baseUrl: TestUrlResolver.resolve('email/js'),
    paths: {
      test: '../test',
      l10nbase: '../shared/js/l10n',
      l10ndate: '../shared/js/l10n_date',
      style: '../style',
      shared: '../shared',

      'mailapi/main-frame-setup': 'ext/mailapi/main-frame-setup',
      'mailapi/main-frame-backend': 'ext/mailapi/main-frame-backend'
    },
    map: {
      '*': {
        'api': 'test/unit/mock_api'
      }
    },
    shim: {
      l10ndate: ['l10nbase'],

      'shared/js/mime_mapper': {
        exports: 'MimeMapper'
      },

      'shared/js/notification_helper': {
        exports: 'NotificationHelper'
      }
    },
    definePrim: 'prim'
  };

  global.testConfig = function(obj, ids, callback) {
    var config = obj.config,
        mocks = obj.mocks,
        defines = obj.defines,
        suiteTeardown = obj.suiteTeardown,
        done = obj.done,
        contextId = 'test' + (contextIdCount += 1);

    var req = requirejs.config({
      context: 'test' + (contextIdCount += 1)
    });

    req.config(baseConfig);
    if (config)
      req.config(config);

    // Tears down the context.
    if (suiteTeardown) {
      suiteTeardown(function() {
        delete requirejs.contexts[contextId];
      });
    }

    // Set up the mocks.
    if (mocks) {
      Object.keys(mocks).forEach(function(id) {
        // Create a map config so that modules that ask
        // for the target ID get the
        var map = {
          '*': {}
        };
        map['*'][id] = '_test/' + id;
        map['_test/' + id] = {};
        map['_test/' + id][id] = id;
        req.config(map);

        var args = mocks[id];
        if (!Array.isArray(args)) {
          args = [args];
        }

        define.apply(null, ['_test/' + id].concat(args));
      });
    }

    if (defines) {
      Object.keys(defines).forEach(function(id) {
        var args = defines[id];
        if (!Array.isArray(args)) {
          args = [args];
        }
        define.apply(null, [id].concat(args));
      });
    }

    if (ids) {
      req(ids, function() {
        if (callback)
          callback.apply(null, Array.slice(arguments));
        if (done)
          done();
      }, function(err) {
        if (done)
          done(err);
      });
    }

    return req;
  };
}(this));

