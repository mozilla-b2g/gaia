/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var GridView = {
  grid: null,

  get visible() {
    return this.grid && this.grid.style.display === 'block';
  },

  hide: function gv_hide() {
    if (this.grid)
      this.grid.style.visibility = 'hidden';
  },

  show: function gv_show() {
    var grid = this.grid;
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'debug-grid';
      grid.dataset.zIndexLevel = 'debug-grid';

      this.grid = grid;
      document.getElementById('screen').appendChild(grid);
    }

    grid.style.visibility = 'visible';
  },

  toggle: function gv_toggle() {
    this.visible ? this.hide() : this.show();
  }
};

SettingsListener.observe('debug.grid.enabled', false, function(value) {
  !!value ? GridView.show() : GridView.hide();
});

