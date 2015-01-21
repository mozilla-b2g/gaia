/* global LockScreenBasicComponent */
'use strict';

/**
 * No, it's not the old 'lockscreen.js' put everything in a 2K SLOC file,
 * but just bootstraping state that set almost all done and transfer
 * to the next state, when the corresponding events come.
 *
 * Our design principle is that every component (panel is also a component)
 * should contain several states that can be transferred to. And the first
 * state, which is actually the bootstraping state, should do only the
 * initialization works, and transfer to the next one when any interrupt
 * comes.
 **/
(function(exports) {
  var LockScreen = function() {};
  LockScreen.prototype = Object.create(LockScreenBasicComponent.prototype);
  exports.LockScreen = LockScreen;
})(window);

