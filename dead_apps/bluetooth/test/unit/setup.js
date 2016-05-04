/* global requirejs */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
requireApp('bluetooth/js/vendor/alameda.js', (function() {
  var contextId = 0;
  var baseConfig = {
    baseUrl: '/js',
    urlArgs: 'bust=' + Date.now(),
    paths: {
      'modules': 'modules',
      'views': 'views',
      'shared': '../shared/js',
      'unit': '../test/unit',
      'shared_mocks': '../shared/test/unit/mocks'
    },
    shim: {},
    modules: [
      {
        name: 'main'
      }
    ]
  };

  this.testRequire = function(modules, map, callback) {
    var ctx;
    if (arguments.length === 2) {
      callback = map;
      map = null;
    }

    ctx = requirejs.config({
      context: contextId++
    });
    ctx.config(baseConfig);
    ctx.config({
      map: map || {}
    });

    ctx(modules, callback);
    return ctx;
  };
}).bind(window));
