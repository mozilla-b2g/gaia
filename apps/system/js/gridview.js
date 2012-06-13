/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var GridView = {
  grid: document.getElementById('debug-grid'),

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
      var style = '#debug-grid {' +
                  '  position: absolute;' +
                  '  top: 0;' +
                  '  left: 0;' +
                  '  display: block;' +
                  '  width: 100%;' +
                  '  height: 100%;' +
                  '  background: url(images/grid.png);' +
                  '  z-index: 30000;' +
                  '  opacity: 0.2;' +
                  '  pointer-events: none;' +
                  '}';
      document.styleSheets[0].insertRule(style, 0);

      grid = document.createElement('div');
      grid.id = 'debug-grid';

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

