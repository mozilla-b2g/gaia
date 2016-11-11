'use strict';
/* global ItemStore, LazyLoader, Configurator */

(function(exports) {

  // Hidden manifest roles that we do not show
  const HIDDEN_ROLES = ['system', 'input', 'homescreen', 'search'];

  function App() {
    this.scrollable = document.querySelector('.scrollable');
    this.grid = document.getElementById('icons');

    this.grid.addEventListener('iconblobdecorated', this);
    this.grid.addEventListener('gaiagrid-iconbloberror', this);
    window.addEventListener('hashchange', this);
    window.addEventListener('gaiagrid-saveitems', this);
    window.addEventListener('online', this.retryFailedIcons.bind(this));

    var editModeDone = document.getElementById('exit-edit-mode');
    editModeDone.addEventListener('click', this.exitEditMode);

    window.addEventListener('gaiagrid-dragdrop-begin', this);
    window.addEventListener('gaiagrid-dragdrop-finish', this);

    window.addEventListener('context-menu-open', this);
    window.addEventListener('context-menu-close', this);

    this.layoutReady = false;
    window.addEventListener('gaiagrid-layout-ready', this);

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
      console.log('B1048639: app init');
      this.itemStore = new ItemStore((firstTime) => {
        if (!firstTime) {
          return;
        }

        LazyLoader.load(['shared/js/icc_helper.js',
                         'shared/js/version_helper.js',
                         'js/configurator.js'], function onLoad() {
          exports.configurator = new Configurator();
        });
      });

      console.log('B1048639: app this.itemStore.all()');
      this.itemStore.all(function _all(results) {
        results.forEach(function _eachResult(result) {
          this.grid.add(result);
        }, this);

        if (this.layoutReady) {
          console.log('B1048639: app calling renderGrid()');
          this.renderGrid();
        } else {
          console.log('B1048639: app layout not ready');
          window.addEventListener('gaiagrid-layout-ready', function onReady() {
            window.removeEventListener('gaiagrid-layout-ready', onReady);
            this.renderGrid();
          }.bind(this));
        }

        window.addEventListener('localized', this.onLocalized.bind(this));
        LazyLoader.load(['shared/style/headers.css',
                         '/shared/js/font_size_utils.js',
                         'js/contextmenu_handler.js',
                         '/shared/js/homescreens/confirm_dialog_helper.js']);
      }.bind(this));
    },

    renderGrid: function() {
      console.log('B1048639: app renderGrid');
      this.grid.setEditHeaderElement(document.getElementById('edit-header'));
      this.grid.render();
    },

    start: function() {
      console.log('B1048639: app start');
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
      console.log('B1048639: app onLocalized');
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
      console.log('B1048639: app handleEvent', e.type);
      switch(e.type) {
        case 'iconblobdecorated':
          var item = e.detail;

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
        case 'context-menu-open':
          // Home button disabled while dragging or the contexmenu is displayed
          window.removeEventListener('hashchange', this);
          break;

        case 'gaiagrid-dragdrop-finish':
        case 'context-menu-close':
          window.addEventListener('hashchange', this);
          break;

        case 'gaiagrid-layout-ready':
          this.layoutReady = true;
          window.removeEventListener('gaiagrid-layout-ready', this);
          break;

        // A hashchange event means that the home button was pressed.
        // The system app changes the hash of the homescreen iframe when it
        // receives a home button press.
        case 'hashchange':
          var _grid = this.grid._grid;

          // Leave edit mode if the user is in edit mode.
          // We do not lazy load dragdrop until after load, so the user can not
          // take this path until libraries are loaded.
          if (_grid.dragdrop && _grid.dragdrop.inEditMode) {
            _grid.dragdrop.exitEditMode();
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

  // Dummy configurator
  exports.configurator = {
    getSingleVariantApp: function() {
      return {};
    },
    get isSingleVariantReady() {
      return true;
    },
    get isSimPresentOnFirstBoot() {
      return false;
    }
  };
  exports.app = new App();
  exports.app.init();

}(window));
