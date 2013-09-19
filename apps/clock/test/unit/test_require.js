requireApp('clock/js/alameda.js');

var testRequire = function(modules, options, callback) {
  var mocks = options && options.mocks;

  if (arguments.length === 2) {
    callback = options;
    options = null;
  }

  requirejs.config({
    baseUrl: '/js',
    paths: {
      mocks: '../test/unit/mocks'
    }
  });

  if (mocks) {
    //var paths = mocks.map(function(mock) { return mock.path; });
    var names = mocks.map(mock => mock.name);
    var paths = mocks.map(mock => mock.path);

    // Undefine modules to be mocked
    requirejs.undef.apply(require, names);

    requirejs(paths, function(require) {
      mocks.forEach(function(mock) {
        var module = require(mock.name);
        define(mock.name, () => module);
      });

      requirejs(modules, callback);
    });
  } else {
    requirejs(modules, callback);
  }

};
