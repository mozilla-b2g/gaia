requireApp('clock/js/alameda.js');

(function(exports) {
  'use strict';

  var ctxIdCount = 0;
  var baseConfig = {
    baseUrl: '/js',
    paths: {
      template: '/shared/js/template',
      mocks: '../test/unit/mocks',
      'async-storage': '../../shared/js/async_storage'
    },
    shim: {
      database: {
        exports: ['SchemaVersion', 'Database'],
        deps: ['utils']
      },
      'template': {
        exports: 'Template'
      },
      'gesture-detector': {
        exports: 'GestureDetector'
      },
      'async-storage': {
        exports: 'asyncStorage'
      }
    }
  };

  /**
   * Function for loading production modules for test.
   *
   * @param {string[]} modules - List of modules to load.
   * @param {Object} [options] - Optional configuration for the require
   *                             operation. Accepts a `mocks` object that
   *                             defines a mapping of module name to mock path.
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
  exports.testRequire = function(modules, options, callback) {
    var mocks = options && options.mocks;
    var map = {};
    var ctx;

    if (arguments.length === 2) {
      callback = options;
      options = null;
    }

    if (mocks) {
      modules.forEach(function(module) {
        map[module] = mocks;
      });
    }

    ctx = requirejs.config({
      context: 'test-' + ctxIdCount++,
      map: map
    });
    ctx.config(baseConfig);

    ctx(modules, callback);

    return ctx;
  };

}(this));
