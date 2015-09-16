'use strict';
/* exported eventSafety */

/**
 * Listens for an event to fire _once_ or a timeout to expire.
 * This is generally used for things which are waiting on transitions
 * as it's sometimes possible to miss the transitionend event.
 * This should not be necessary once we have web animations as they
 * will guarantee that a callback is fired.
 *
 * Usage:
 *
 *   eventSafety(window, 'transitionend', callback, 400);
 *
 *   eventSafety(window, 'transitionend', 400).then(() => { ... });
 *
 * @param {Object} obj
 *   Object to listen to the event on.
 * @param {String} event
 *   The name of the event.
 * @param {Function} callback
     Optional; called after the event is fired.
 * @param {Integer} timeout The duration of the safety timeout.
 *
 * @return {Promise}
 *   A promise that will never reject.
 */
function eventSafety(obj, event, callback, timeout) {
  if (typeof callback === 'number') {
    timeout = callback;
    callback = null;
  }

  if (!timeout) {
    throw new Error('You must pass a valid timeout value to `eventSafety`.');
  }

  return new Promise((resolve) => {
    var finishTimeout;
    function done(e) {
      // transitionend events bubble by default, so we filter them by element.
      if (e && e.type === 'transitionend' && e.target !== obj) {
        return;
      }

      clearTimeout(finishTimeout);
      obj.removeEventListener(event, done);
      if (callback) {
        /*jshint validthis:true */
        resolve(callback.apply(this, arguments));
      } else {
        resolve(e);
      }
    }
    finishTimeout = setTimeout(done, timeout);
    obj.addEventListener(event, done);
  });
}
