define(function(require, exports, module) {
'use strict';

/**
 * Returns the offline status.
 */
module.exports = function() {
  return (navigator && 'onLine' in navigator) ? !navigator.onLine : true;
};

});
