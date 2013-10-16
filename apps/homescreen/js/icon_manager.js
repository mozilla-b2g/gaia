
'use strict';

var IconManager = (function() {

  var noop = function() {};

  //  The numerical ID of the active timeout for icons
  var activeTimeout = null;

  var activeDelay = 0;

  var removeActive = noop;

  function addActive(target) {
    if ('isIcon' in target.dataset) {
      if (activeDelay) {
        activeTimeout = setTimeout(function() {
          target.classList.add('active');
          activeTimeout = null;
        }, activeDelay);
      } else {
        target.classList.add('active');
      }
      removeActive !== noop && removeActive();
      removeActive = function _removeActive() {
        target.classList.remove('active');
        clearActiveTimeout();
        removeActive = noop;
      };
    } else {
      removeActive = noop;
    }
  }

  function clearActiveTimeout() {
    if (activeTimeout !== null) {
      clearTimeout(activeTimeout);
      activeTimeout = null;
    }
  }

  return {
    /*
     * Initializes the component
     *
     * @param{Integer} It defines the milliseconds for active delay
     */
    init: function im_init(time) {
      activeDelay = time;
    },

    /*
     * Enables the active effect for an icon after a certain delay
     *
     * @param{Object} DOM node
     */
    addActive: function im_addActive(element) {
      addActive(element);
    },

    /*
     * Disables the active effect for an icon immediately
     */
    removeActive: function im_removeActive() {
      removeActive();
    },

    /*
     * Prevents the active effect if the delay hasn't been reached
     */
    cancelActive: clearActiveTimeout
  };
}());
