// Loader plugin for loading CSS. Does not guarantee loading via onload
// watching, just inserts link tag.
// PS: borrowed from email app and edited it to include the baseUrl
define(function(require, exports) {
'use strict';

exports.baseUrl = '/style/';

exports.load = function(id, require, onload, config) {
  if (config.isBuild) {
    return onload();
  }

  var style = document.createElement('link');
  style.type = 'text/css';
  style.rel = 'stylesheet';
  style.href = require.toUrl(exports.baseUrl + id + '.css');
  style.addEventListener('load', onload, false);
  document.head.appendChild(style);
};

});
