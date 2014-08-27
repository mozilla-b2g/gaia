/* global Factory, requirejs */

(function(window) {
  'use strict';
  var configured = false;
  function loadAmd(path) {
    return new Promise(function(accept) {
      var req = require('/js/ext/alameda.js').then(function() {
        if (!configured) {
          requirejs.config({
            baseUrl: '/js/',
            paths: {
              '/test/': '/test/'
            }
          });
          configured = true;
        }

        requirejs([path], function() {
          accept();
        });
      });
    });
  }
  window.testAgentRuntime.testLoader = loadAmd;
}(this));
