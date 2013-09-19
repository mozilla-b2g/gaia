requireApp('clock/js/alameda.js');

var testRequire = function(modules, options, callback) {
  var mocks = options && options.mocks;
  var map = {};

  if (arguments.length === 2) {
    callback = options;
    options = null;
  }

  if (mocks) {
    modules.forEach(function(module) {
      map[module] = mocks;
    });
  }

  requirejs.config({
    baseUrl: '/js',
    map: map,
    paths: {
      mocks: '../test/unit/mocks'
    }
  });

  requirejs(modules, callback);
};
