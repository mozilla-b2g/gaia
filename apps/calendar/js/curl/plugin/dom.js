define(function(require, exports) {
'use strict';

var LazyLoader = require('shared/lazy_loader');

exports.load = function(id, require, onLoad, config) {
  if (config.isBuild) {
    return onLoad();
  }

  var node = document.getElementById(id);
  if (!node) {
    onLoad.error('can\'t find element with id #' + id);
    return;
  }

  LazyLoader.load(node, function() {
    onLoad(node);
  });
};

});
