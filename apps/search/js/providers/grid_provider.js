/* global Provider */

'use strict';

function DataGridProvider() {
}

DataGridProvider.prototype = {

  __proto__: Provider.prototype,

  name: 'DataGridProvider',

  init: function() {
    this.grid = document.getElementById('icons');

    // Hack to force a 4 column layout
    window.dispatchEvent(new CustomEvent('appzoom', {
      'detail': {
        cols: 4
      }
    }));
  },

  clear: function() {
    this.grid.clear();
  },

  render: function(results) {
    results.forEach(function(config, index) {
      this.grid.add(config.data);
    }, this);
    this.grid.render({
      skipDivider: true
    });
  }
};
