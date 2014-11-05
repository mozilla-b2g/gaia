'use strict';

/**
 * Utility class to fire events needed to measure the performance
 * of the application.
 * For an explanation of what means each event go here:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=996038
 * For an explanation of how are adapted to the specific needs
 * in the contacts app please go here:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1015388#c8
 */
(function(){

  window.utils = window.utils || {};

  var PerformanceHelper = {
    domLoaded: function() {
      window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));
    },
    chromeInteractive: function() {
      window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
    },
    visuallyComplete: function() {
      window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));
    },
    contentInteractive: function() {
      window.dispatchEvent(new CustomEvent('moz-content-interactive'));
    },
    loadEnd: function() {
      window.dispatchEvent(new CustomEvent('moz-app-loaded'));
    }
  };


  window.utils.PerformanceHelper = PerformanceHelper;

})();
