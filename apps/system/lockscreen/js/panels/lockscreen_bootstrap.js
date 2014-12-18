/* global LockScreenBasicComponent */
/* global LockScreenClockWidget, LockScreenConnectionWidget */

'use strict';

/***/
(function(exports) {
  var LockScreenBootstrap = function() {
    LockScreenBasicComponent.apply(this);
    this.elements = {
      'view': '#lockscreen',
      'clock': '#lockscreen-clock',
      'connection': '#lockscreen-connection'
    };
    this.components = {
      'clock': new LockScreenClockWidget(),
      'connection': new LockScreenConnectionWidget()
    };
  };
  LockScreenBootstrap.prototype =
    Object.create(LockScreenBasicComponent);
  LockScreenBootstrap.prototype.start = function() {
    LockScreenBasicComponent
      .start()
      .next(this.startComponents.bind(this))
      .wait(this.components.clock
        .start({'view': this.elements.clock}),
            this.components.connection
        .start({'view': this.elements.connection}));
  };

  exports.LockScreenBootstrap = LockScreenBootstrap;
})(window);

