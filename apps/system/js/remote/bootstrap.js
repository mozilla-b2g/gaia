/* global BaseModule */
'use strict';

(function(exports) {
  window.addEventListener('load', () => {
    exports.app = BaseModule.instantiate('App');
    exports.app && exports.app.start();
  });
}(window));
