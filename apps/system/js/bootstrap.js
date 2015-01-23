/* global BaseModule */
'use strict';

window.addEventListener('load', function startup() {
  window.performance.mark('loadEnd');
  window.core = BaseModule.instantiate('Core');
  window.core && window.core.start();
});
