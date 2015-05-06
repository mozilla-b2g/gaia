/* global EPG */
'use strict';

(function(exports) {
  window.addEventListener('load', function() {
    /* jshint nonew: false */
    window.epg = new EPG();
  });
})(window);
