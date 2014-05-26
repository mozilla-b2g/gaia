'use strict';
/* global app */
/* global LazyLoader */
/* global MozActivity */
/* global wallpaper */
/* jshint nonew: false */

(function(exports) {

  function ContextMenuUI() {
    this.grid = document.getElementById('icons');
    this.dialog = document.getElementById('contextmenu-dialog');
    this.collectionOption = document.getElementById('create-smart-collection');
    this.wallpaperOption = document.getElementById('change-wallpaper-action');

    this.handleCancel = this._handleCancel.bind(this);
  }

  ContextMenuUI.prototype = {
    show: function() {
      this.dialog.addEventListener('gaiamenu-cancel', this.handleCancel);
      this.dialog.removeAttribute('hidden');
      this.collectionOption.addEventListener('click', this);
      this.wallpaperOption.addEventListener('click', this);
    },

    hide: function() {
      this.dialog.removeEventListener('gaiamenu-cancel', this.handleCancel);
      this.collectionOption.removeEventListener('click', this);
      this.wallpaperOption.removeEventListener('click', this);
      this.dialog.setAttribute('hidden', '');
    },

    _handleCancel: function(e) {
      this.hide();
    },

    handleEvent: function(e) {
      if (e.type !== 'click') {
        return;
      }

      switch(e.target.id) {
        case 'change-wallpaper-action':
          LazyLoader.load(['shared/js/omadrm/fl.js',
                           'js/wallpaper.js'], function() {
            this.hide();
            wallpaper.change();
          }.bind(this));

          break;

        case 'create-smart-collection':
          this.hide();

          var maxIconSize = this.grid.maxIconSize;
          var activity = new MozActivity({
            name: 'create-collection',
            data: {
              type: 'folder',
              maxIconSize: maxIconSize
            }
          });

          app.homescreenFocused = false;

          activity.onsuccess = function onsuccess() {
            app.homescreenFocused = true;
          };

          activity.onerror = function onerror(e) {
            app.homescreenFocused = true;
            alert(this.error.name || 'generic-error-message');
          };

          break;
      }
    }
  };

  exports.contextMenuUI = new ContextMenuUI();

}(window));
