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
      this.panel = document.getElementById('about');
      this.version = this.panel.querySelector('#privacy-panel-version');
      this.build = this.panel.querySelector('#privacy-panel-build');

      panels.loadJSON('resources/about.json', function(data) {
        this.regionsAndCities = data;

        this.version.textContent = data.version;
        this.build.textContent = data.build;
      }.bind(this));
    }
  };

  return About;

});
