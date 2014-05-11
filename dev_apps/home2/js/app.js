'use strict';
/* global ItemStore */
/* global MozActivity */
/*jshint nonew: false */

(function(exports) {

  // Hidden manifest roles that we do not show
  const HIDDEN_ROLES = ['system', 'keyboard', 'homescreen', 'search'];

  function App() {
    this.grid = document.getElementById('icons');

    window.addEventListener('hashchange', this);
    window.addEventListener('appzoom', this);
    window.addEventListener('gaiagrid-saveitems', this);
    window.addEventListener('contextmenu', this);
  }

  App.prototype = {

    HIDDEN_ROLES: HIDDEN_ROLES,

    /**
     * Fetch all icons and render them.
     */
    init: function() {
      this.itemStore = new ItemStore();
      this.itemStore.all(function _all(results) {
        results.forEach(function _eachResult(result) {
          this.grid.add(result);
        }, this);
        this.grid.render();
      }.bind(this));
    },

    start: function() {
      this.grid.start();
    },

    stop: function() {
      this.grid.stop();
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
        case 'gaiagrid-saveitems':
          this.itemStore.save(this.grid.getItems());
          break;
        case 'contextmenu':
          // Todo: Show options menu with option to add smart collection
          // For now we just launch the new smart collection activity.
          var activity = new MozActivity({
            name: 'create-collection',
            data: {
              type: 'folder'
            }
          });
          activity.onsuccess = function onsuccess() {
            // TODO
            // do something with this.result?
          };
          activity.onerror = function onerror(e) {
            // TODO show error dialog?
            alert(this.error.name || 'generic-error-message');
          };
          break;

        case 'hashchange':
          if (this.grid._grid.dragdrop.inEditMode) {
            this.grid._grid.dragdrop.exitEditMode();
            return;
          }

          var step;
          var doScroll = function() {
            var scrollY = window.scrollY;
            step = step || (scrollY / 20);

            if (!scrollY) {
              return;
            }

            if (scrollY <= step) {
              window.scrollTo(0, 0);
              return;
            }

            window.scrollBy(0, -step);
            window.requestAnimationFrame(doScroll);
          };

          doScroll();
          break;

        case 'appzoom':
          this.grid.render();
          break;
      }
    }
  };

  exports.app = new App();
  exports.app.init();

}(window));
