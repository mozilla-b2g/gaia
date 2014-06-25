'use strict';
/* global ItemStore */

(function(exports) {

  // Hidden manifest roles that we do not show
  const HIDDEN_ROLES = ['system', 'input', 'homescreen', 'search'];

  function App() {
    this.scrollable = document.querySelector('.scrollable');
    this.grid = document.getElementById('icons');

    this.grid.addEventListener('gaiagrid-iconblobload', this);
    this.grid.addEventListener('gaiagrid-iconbloberror', this);
    window.addEventListener('hashchange', this);
    window.addEventListener('gaiagrid-saveitems', this);
    window.addEventListener('online', this.retryFailedIcons.bind(this));

    var editModeDone = document.getElementById('exit-edit-mode');
    editModeDone.addEventListener('click', this.exitEditMode);

    window.addEventListener('gaiagrid-dragdrop-begin', this);
    window.addEventListener('gaiagrid-dragdrop-finish', this);

    // some terrible glue to keep track of which icons failed to download
    // and should be retried when/if we come online again.
    this._iconsToRetry = [];
  }

  App.prototype = {

    HIDDEN_ROLES: HIDDEN_ROLES,

    /**
     * Showing the correct icon is ideal but sometimes not possible if the
     * network is down (or some other random reason we could not fetch at the
     * time of installing the icon on the homescreen) so this function handles
     * triggering the retries of those icon displays.
     */
    retryFailedIcons: function() {
      if (!this._iconsToRetry.length) {
        return;
      }

      var icons = this.grid.getIcons();
      var iconId;

      // shift off items so we don't rerun them if we go online/offline quicky.
      while ((iconId = this._iconsToRetry.shift())) {
        var icon = icons[iconId];
        // icons may be removed so just continue on if they are now missing
        if (!icon) {
          continue;
        }

        // attempt to re-render the icon which also fetches it. If this fails it
        // will trigger another failure event and eventually end up here again.
        icon.renderIcon();
      }
    },

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

      this.grid.setEditHeaderElement(document.getElementById('edit-header'));
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
        case 'gaiagrid-iconblobload':
          var item = e.detail;

          // do not attempt to cache the app:// protocol icons
          if (item.icon.startsWith('app://')) {
            return;
          }

          // XXX: sad naming... e.detail is a gaia grid GridItem interface.
          this.itemStore.saveItem(item.detail, () => {
            // test prefix to indicate this is used for testing only.
            item.element.classList.add('test-icon-cached');
          });
          break;

        case 'gaiagrid-iconbloberror':
          // Attempt to redownload this icon at some point in the future
          this._iconsToRetry.push(e.detail.identifier);
          break;

        case 'gaiagrid-saveitems':
          this.itemStore.save(this.grid.getItems());
          break;

        case 'gaiagrid-dragdrop-begin':
          // Home button disabled while dragging
          window.removeEventListener('hashchange', this);
          break;

        case 'gaiagrid-dragdrop-finish':
          window.addEventListener('hashchange', this);
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
