'use strict';
/* global ItemStore */

(function(exports) {

  // Hidden manifest roles that we do not show
  const HIDDEN_ROLES = ['system', 'keyboard', 'homescreen', 'search'];

  function App() {
    this.scrollable = document.querySelector('.scrollable');
    this.grid = document.getElementById('icons');
    this.homescreenFocused = true;

    window.addEventListener('hashchange', this);
    window.addEventListener('appzoom', this);
    window.addEventListener('gaiagrid-saveitems', this);
    window.addEventListener('gaiagrid-collection-open', this);
    window.addEventListener('gaiagrid-collection-close', this);
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

        case 'gaiagrid-collection-open':
          this.homescreenFocused = false;
          break;

        case 'gaiagrid-collection-close':
          this.homescreenFocused = true;
          break;

        case 'hashchange':
          if (this.grid._grid.dragdrop.inEditMode) {
            this.grid._grid.dragdrop.exitEditMode();
            return;
          }

          if (!this.homescreenFocused) {
            return;
          }

          var step;
          var scrollable = this.scrollable;

          var doScroll = function() {
            var scrollY = scrollable.scrollTop;
            step = step || (scrollY / 20);

            if (!scrollY) {
              return;
            }

            if (scrollY <= step) {
              scrollable.scrollTop = 0;
              return;
            }

            scrollable.scrollTop -= step;
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
