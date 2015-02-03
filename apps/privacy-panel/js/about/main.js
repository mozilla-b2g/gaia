/**
 * About page panel
 *
 * @module About
 * @return {Object}
 */
define([
  'panels'
],

function(panels) {
  'use strict';

  var About = {

    init: function() {
      var version = document.getElementById('privacy-panel-version');
      var build = document.getElementById('privacy-panel-build');
      panels.loadJSON('resources/about.json', data => {
        version.textContent = data.version;
        build.textContent = data.build;
      });
    }

  };

  return About;
});
