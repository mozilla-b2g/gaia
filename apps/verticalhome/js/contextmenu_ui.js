'use strict';
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
    this.settingsOption = document.getElementById('homescreen-settings-action');

    this.handleCancel = this._handleCancel.bind(this);
  }

  ContextMenuUI.prototype = {
    show: function(e) {
      var nearestIndex = this.grid._grid.getNearestItemIndex(
        e.pageX,
        e.pageY - this.grid.offsetTop
      );

      window.dispatchEvent(new CustomEvent('context-menu-open', {
        detail: {
          nearestIndex: nearestIndex
        }
      }));

      this.dialog.addEventListener('gaiamenu-cancel', this.handleCancel);
      this.dialog.removeAttribute('hidden');
      this.collectionOption.addEventListener('click', this);
      this.wallpaperOption.addEventListener('click', this);
      this.settingsOption.addEventListener('click', this);
      window.addEventListener('visibilitychange', this);
    },

    hide: function() {
      this.dialog.removeEventListener('gaiamenu-cancel', this.handleCancel);
      this.dialog.setAttribute('hidden', '');
      this.collectionOption.removeEventListener('click', this);
      this.wallpaperOption.removeEventListener('click', this);
      this.settingsOption.removeEventListener('click', this);
      window.removeEventListener('visibilitychange', this);

      window.dispatchEvent(new CustomEvent('context-menu-close'));
    },

    _handleCancel: function(e) {
      this.hide();
    },

    _actions: {
      'change-wallpaper-action': function() {
        LazyLoader.load([
          'shared/js/omadrm/fl.js',
          'js/wallpaper.js'
        ], function() {
          this.hide();
          wallpaper.change();
        }.bind(this));
      },

      'create-smart-collection': function() {
        this.hide();

        window.dispatchEvent(new CustomEvent('collections-create-begin'));

        var maxIconSize = this.grid.maxIconSize;
        var activity = new MozActivity({
          name: 'create-collection',
          data: {
            type: 'folder',
            maxIconSize: maxIconSize
          }
        });

        activity.onsuccess = function(e) {
          window.dispatchEvent(new CustomEvent('collections-create-return', {
            detail: {
              ids: activity.result
            }
          }));
        };

        activity.onerror = function onerror(e) {
          window.dispatchEvent(new CustomEvent('collections-create-return'));
          if (this.error.name !== 'ActivityCanceled') {
            alert(this.error.name);
          }
        };
      },

      'homescreen-settings-action': function() {
        this.hide();

        new MozActivity({
          name: 'configure',
          data: {
            target: 'device',
            section: 'homescreen'
          }
        });
      }
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'click':
          this._actions[e.target.id].call(this);
          break;

        case 'visibilitychange':
          if (document.hidden) {
            this.hide();
          }
          break;
      }
    }
  };

  exports.contextMenuUI = new ContextMenuUI();

}(window));
