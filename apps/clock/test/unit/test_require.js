requireApp('clock/js/alameda.js', function() {
  'use strict';

  var ctxIdCount = 0;
  var baseConfig = {
    baseUrl: '/js',
    paths: {
      shared: '../shared',
      mocks: '../test/unit/mocks'
    },
    urlArgs: 'cache_bust=' + Date.now(),
    map: {
      '*': {
        'l10n': 'mocks/mock_shared/js/l10n'
      }
    },
    shim: {
      database: {
        exports: ['SchemaVersion', 'Database'],
        deps: ['utils']
      },
      emitter: {
        exports: 'Emitter'
      },
      'shared/js/template': {
        exports: 'Template'
      },
      'shared/js/gesture_detector': {
        exports: 'GestureDetector'
      },
      'shared/js/async_storage': {
        exports: 'asyncStorage'
      },
      'mocks/mock_shared/js/l10n': {
        exports: 'MockL10n'
      },
      'shared/js/l10n_date': ['shared/js/l10n']
    }
  };

  /**
   * Function for loading production modules for test.
   *
   * @param {string[]} modules - List of modules to load.
   * @param {Object} [options] - Optional configuration for the require
   *                             operation. Accepts a `mocks` array of module
   *                             names to replace with their corresponding mock
   *                             in the `test/unit/mocks/` directory.
   * @param {Function} callback - Function to be invoked when all modules have
   *                              been defined. As in traditional AMD, the
   *                              requested modules will be parameterized in
   *                              this function.
   *
   * Works like typical `require` function, but accepts an optional second
   * argument for defining mock modules.
   *
   * Each invocation uses a distinct Require.js context, meaning that modules
   * will be re-loaded for distinct calls. This context is returned in the
   * event that test authors need to do additional loading.
   */
  this.testRequire = function(modules, options, callback) {
    var toMock = options && options.mocks;
    var ctx, map;

    if (arguments.length === 2) {
      callback = options;
      options = null;
    }

    ctx = requirejs.config({
      context: 'test-' + ctxIdCount++
    });
    ctx.config(baseConfig);

    if (toMock) {
      map = {
        '*': {}
      };
      toMock.forEach(function(id) {
        var mockId = 'mocks/mock_' + id;

        map['*'][id] = mockId;
        map[mockId] = {};
        map[mockId][id] = id;
      });

      ctx.config({
        map: map
      });
    }

    ctx(modules, callback);

    return ctx;
  };

}.bind(this));
