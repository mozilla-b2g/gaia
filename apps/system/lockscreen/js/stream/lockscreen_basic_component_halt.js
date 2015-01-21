/* global LockScreenBasicComponent */
'use strict';

/**
 * Only parent can invoke a subcomponent from halting state.
 */
(function(exports) {
  var LockScreenBasicComponentHalt = function() {
    LockScreenBasicComponent.apply(this);
    this.configs.name = '__halt__';
  };

  exports.LockScreenBasicComponentHalt = LockScreenBasicComponentHalt;
})(window);

