requireApp('clock/js/alameda.js');

(function(exports) {
  'use strict';

  var contextIdCount = 0;
  var baseConfig = {
    baseUrl: '/js',
    paths: {
      template: '/shared/js/template',
      mocks: '../test/unit/mocks',
      'async-storage': '../../shared/js/async_storage'
    },
    shim: {
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

  exports.testRequire = function(modules, options, callback) {
    var mocks = options && options.mocks;
    var map = {};
    var req;

    if (arguments.length === 2) {
      callback = options;
      options = null;
    }

    if (mocks) {
      modules.forEach(function(module) {
        map[module] = mocks;
      });
    }

    requirejs.config(baseConfig);
    requirejs.config({
      map: map
    });

    requirejs(modules, callback);
  };

}(this));
