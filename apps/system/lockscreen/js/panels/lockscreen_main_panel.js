/* global LockScreenBasicComponent */
'use strict';

(function(exports) {
  var LockScreenBootstrap = function() {
    LockScreenBasicComponent.apply(this);
  };
  LockScreenBootstrap.prototype =
    Object.create(LockScreenBasicComponent.prototype);
  exports.LockScreenBootstrap = LockScreenBootstrap;
})(window);

