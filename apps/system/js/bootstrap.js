/* global Core */
/* jshint nonew: false */
'use strict';

window.addEventListener('load', function startup() {
  window.systemApp = new Core();
  try {
    window.systemApp.start();
  } catch (e) {
    console.log(e);
  }
});