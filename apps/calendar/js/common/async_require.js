define(function(require, exports, module) {
'use strict';

module.exports = function(ids) {
  if (!Array.isArray(ids)) {
    ids = [ids];
  }

  // We want to find the "global" require that implements
  // https://github.com/amdjs/amdjs-api/wiki/require even though
  // it is not required by the amd spec nor is it implemented by all loaders.
  // First we'll try to find curl and then, if that doesn't work,
  // we'll try to find one that has require.toUrl().
  // Either way we want this to work in the app and also in unit tests.
  var requireFn = window.requirejs || window.require || require;
  return new Promise((resolve, reject) => requireFn(ids, resolve, reject));
};

});
