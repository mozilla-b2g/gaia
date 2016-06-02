define(function(require, exports, module) {
'use strict';

module.exports = function(name) {
  return name
    .replace(/^./, chr => chr.toLowerCase())
    .replace(/[A-Z]/g, chr => '_' + chr.toLowerCase());
};

});
