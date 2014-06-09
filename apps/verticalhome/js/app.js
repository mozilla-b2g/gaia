'use strict';
/* global ItemStore */

(function(exports) {

  // Hidden manifest roles that we do not show
  const HIDDEN_ROLES = ['system', 'input', 'homescreen', 'search'];

  function App() {
    this.scrollable = document.querySelector('.scrollable');
    this.grid = document.getElementById('icons');

    window.addEventListener('hashchange', this);
    window.addEventListener('gaiagrid-saveitems', this);

    var editModeDone = document.getElementById('exit-edit-mode');
    editModeDone.addEventListener('click', this.exitEditMode);
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

        window.addEventListener('localized', this.onLocalized.bind(this));
      }.bind(this));
    },

    start: function() {
      this.grid.start();
    },

    stop: function() {
      this.grid.stop();
    },

    /**
     * Called whenever the page is localized after the first render.
     * Localizes all of the items.
     */
    onLocalized: function() {
      var items = this.grid.getItems();
      var titles = [];
      items.forEach(function eachItem(item) {
        if(!item.name) {
          return;
        }

        // Name is a magic getter and always returns the localized name of
        // the app. We just need to get it and set the content.
        var element = item.element.querySelector('.title');
        element.textContent = item.name;

        // Bug 1022866 - Workaround for projected content nodes disappearing
        // We need to hide and 'flash' the the element style.
        element.style.display = 'none';

        titles.push(element);
      });

      // Bug 1022866 - Recover from workaround, display titles afer a reflow.
      document.body.clientTop;
      titles.forEach(function eachItem(title) {
        title.style.display = '';
      });
    },

    /**
     * Called when we press 'Done' to exit edit mode.
     * Fires a custom event to use the same path as pressing the home button.
     */
    exitEditMode: function(e) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('hashchange'));
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
        case 'gaiagrid-saveitems':
          this.itemStore.save(this.grid.getItems());
          break;

        case 'hashchange':
          if (this.grid._grid.dragdrop.inEditMode) {
            this.grid._grid.dragdrop.exitEditMode();
            return;
          }

          // Bug 1021518 - ignore home button taps on lockscreen
          if (document.hidden) {
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
      }
    }
  };

  exports.app = new App();

}(window));
