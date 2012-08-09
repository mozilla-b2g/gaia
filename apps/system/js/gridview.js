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
      this.grid.style.display = 'none';
  },

  show: function gv_show() {
    var grid = this.grid;
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'debug-grid';
      grid.dataset.zindexLevel = 'debug-grid';

      this.grid = grid;
      document.body.appendChild(grid);
    }

    grid.style.display = 'block';
  },

  toggle: function gv_toggle() {
    this.visible ? this.hide() : this.show();
  }
};

SettingsListener.observe('debug.grid.enabled', false, function(value) {
  !!value ? GridView.show() : GridView.hide();
});

