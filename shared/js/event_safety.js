'use strict';
/* exported eventSafety */

/**
 * Guarantees a callback will be fired with a backing setTimeout.
 * This is generally used for things which are waiting on transitions
 * as it's sometimes possible to miss the transitionend event.
 * This should not be necessary once we have web animations as they
 * will guarantee that a callback is fired.
 * @param {Object} obj Object to listen to the event on.
 * @param {String} event The name of the event.
 * @param {Function} callback What to call after the event or timeout.
 * @param {Integer} timeout The duration of the safety timeout.
 */
function eventSafety(obj, event, callback, timeout) {
  var finishTimeout;

  function done(e) {

    // transitionend events bubble by default, so we filter them by element.
    if (e && e.type === 'transitionend' && e.target !== obj) {
      return;
    }

    clearTimeout(finishTimeout);
    obj.removeEventListener(event, done);
    /*jshint validthis:true */
    callback.apply(this, arguments);
  }

  obj.addEventListener(event, done);
  finishTimeout = setTimeout(done, timeout);
}
