'use strict';
/* global app */
/* global LazyLoader */
/* global MozActivity */
/* global wallpaper */
/* jshint nonew: false */

(function(exports) {

  function ContextMenuUI() {
    this.dialog = document.getElementById('contextmenu-dialog');
    this.menu = document.querySelector('#contextmenu-dialog menu');
  }

  ContextMenuUI.prototype = {
    show: function() {
      if (this.displayed) {
        return;
      }

      this.displayed = true;
      var classList = this.dialog.classList;
      classList.add('visible');
      this.menu.addEventListener('click', this);
      setTimeout(function() {
        classList.add('show');
      }, 50); // Give the opportunity to paint the UI component
    },

    hide: function(cb) {
      if (!this.displayed) {
        cb && cb();
        return;
      }

      this.displayed = false;
      var dialog = this.dialog;
      var classList = dialog.classList;
      this.menu.removeEventListener('click', this);
      dialog.addEventListener('transitionend', function hide(e) {
        dialog.removeEventListener('transitionend', hide);
        classList.remove('visible');
        cb && cb();
      });

      classList.remove('show');
    },

    handleEvent: function(e) {
      if (e.type !== 'click') {
        return;
      }

      switch(e.target.id) {
        case 'change-wallpaper-action':
          LazyLoader.load(['shared/js/omadrm/fl.js',
                           'js/wallpaper.js'], function() {
            this.hide(wallpaper.change);
          }.bind(this));

          break;

        case 'create-smart-collection':
          this.hide(function onhide() {
            var activity = new MozActivity({
              name: 'create-collection',
              data: {
                type: 'folder'
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
          });
          break;

        case 'cancel-action':
          this.hide();

          break;
      }
    }
  };

  exports.contextMenuUI = new ContextMenuUI();

}(window));
