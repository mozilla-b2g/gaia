'use strict';

/* global KeyboardApp */

(function() {
  var app = window.app = new KeyboardApp();
  // Wait until load event, or the app itself will get resize event twice,
  // which may intervene the UI update logic.
  window.addEventListener('load', app.start.bind(app));
}());
