/* global Provider */

'use strict';

function DataGridProvider() {
}

DataGridProvider.prototype = {

  __proto__: Provider.prototype,

  name: 'DataGridProvider',

  isGridProvider: true,

  init: function() {
    this.grid = document.getElementById('icons');
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
