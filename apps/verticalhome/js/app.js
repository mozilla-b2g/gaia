'use strict';
/* global ItemStore, LazyLoader, Configurator,
          groupEditor, PinnedAppsNavigation, Clock,
          PinnedAppsManager, MoreAppsNavigation */
/* global requestAnimationFrame */

(function(exports) {

  // Hidden manifest roles that we do not show
  const HIDDEN_ROLES = [
    'system', 'input', 'homescreen', 'theme', 'addon', 'langpack'
  ];

  const EDIT_MODE_TRANSITION_STYLE =
    'transform 0.25s ease 0s, height 0s ease 0.5s';

  function App() {
    window.performance.mark('navigationLoaded');
    window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));
    this.grid = document.getElementById('icons');

    this.grid.addEventListener('iconblobdecorated', this);
    this.grid.addEventListener('gaiagrid-iconbloberror', this);
    this.grid.addEventListener('gaiagrid-attention', this);
    this.grid.addEventListener('gaiagrid-resize', this);
    this.grid.addEventListener('cached-icons-rendered', this);
    this.grid.addEventListener('edititem', this);
    this.grid.addEventListener('editmode-start', this);
    this.grid.addEventListener('editmode-end', this);
    window.addEventListener('hashchange', this);
    window.addEventListener('gaiagrid-saveitems', this);
    window.addEventListener('online', this.retryFailedIcons.bind(this));

    window.addEventListener('gaiagrid-dragdrop-begin', this);
    window.addEventListener('gaiagrid-dragdrop-finish', this);

    window.addEventListener('context-menu-open', this);
    window.addEventListener('context-menu-close', this);

    window.addEventListener('keydown', this);

    this.layoutReady = false;
    window.addEventListener('gaiagrid-layout-ready', this);

    // some terrible glue to keep track of which icons failed to download
    // and should be retried when/if we come online again.
    this._iconsToRetry = [];

    window.performance.mark('navigationInteractive');
    window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));

  }

  App.prototype = {

    HIDDEN_ROLES: HIDDEN_ROLES,
    EDIT_MODE_TRANSITION_STYLE: EDIT_MODE_TRANSITION_STYLE,

    inMoreApps: false,
    pinnedAppsManager: null,
    clock: new Clock(),

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

      //TODO: Make a dynamic load of gaia_grid_rs component.
      //Load it when gaia grid launch at the first time
      //not when all application starts
      this.itemStore.all(function _all(results) {
        results.forEach(function _eachResult(result) {
          this.grid.add(result);
        }, this);

        if (this.layoutReady) {
          this.renderGrid();
        } else {
          window.addEventListener('gaiagrid-layout-ready', function onReady() {
            window.removeEventListener('gaiagrid-layout-ready', onReady);
            this.renderGrid();
          }.bind(this));
        }

        window.performance.mark('visuallyLoaded');
        window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));
        window.performance.mark('contentInteractive');
        window.dispatchEvent(new CustomEvent('moz-content-interactive'));

        window.addEventListener('localized', this.onLocalized.bind(this));
        LazyLoader.load(['shared/elements/gaia-header/dist/gaia-header.js',
                         'js/contextmenu_handler.js',
                         '/shared/js/homescreens/confirm_dialog_helper.js'],
          function() {
            window.performance.mark('fullyLoaded');
            window.dispatchEvent(new CustomEvent('moz-app-loaded'));
          });
        MoreAppsNavigation.init();
      }.bind(this));

      this.pinnedAppsManager = new PinnedAppsManager();

      /**
       * After data about applications was loaded to screen it should be
       * initialized main screen's timer for clock, manager for main screen
       * and navigation for main screen.
       */
      window.addEventListener('pinned-apps-loaded', function(e) {
        this.pinnedAppsManager.init();
        this.clock.start();
        var pinnedApps = document.getElementById('pinned-apps-list');
        var sel = '#pinned-apps-list .pinned-app-item';
        try{
          this.pinnedAppsNavigation = new PinnedAppsNavigation(pinnedApps, sel);
        } catch(exception) {
          console.error(exception);
        }
      }.bind(this));

    },

    renderGrid: function() {
      this.grid.render();
    },

    start: function() {
      this.grid.start();
    },

    stop: function() {
      this.grid.stop();
    },

    getAppByURL: function(url) {
      return this.itemStore.getAppByURL(url);
    },

    getPinnedAppsList: function() {
      return this.itemStore.getPinnedAppsList();
    },

    savePinnedAppItem: function(obj) {
      this.itemStore.savePinnedAppItem(obj);
    },

    savePinnedApps: function(objs) {
      this.itemStore.savePinnedApps(objs);
    },

    showMoreApps: function() {
      this.inMoreApps = true;
      console.log('inMoreApps is : ' + this.inMoreApps);
      document.getElementById('main-screen').classList.add('hidden');
      document.getElementById('more-apps-screen').classList.remove('hidden');
      MoreAppsNavigation.reset();
    },

    hideMoreApps: function() {
      this.inMoreApps = false;
      console.log('inMoreApps is : ' + this.inMoreApps);
      document.getElementById('main-screen').classList.remove('hidden');
      document.getElementById('more-apps-screen').classList.add('hidden');
    },

    /**
     * Called whenever the page is localized after the first render.
     * Localizes all of the items.
     */
    onLocalized: function() {
      var items = this.grid.getItems();
      items.forEach(function eachItem(item) {
        if(!item.name) {
          return;
        }

        item.updateTitle();
      });
      this.renderGrid();
      app.pinnedAppsManager.items.forEach(item => item.render());
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
        // Expose the cached-icons-rendered to the window. This makes it so
        // we don't have to couple the item store and the app object.
        case 'cached-icons-rendered':
          window.dispatchEvent(
            new CustomEvent('gaiagrid-cached-icons-rendered'));
          break;

        case 'iconblobdecorated':
          var item = e.detail;

          // XXX: sad naming... e.detail is a gaia grid GridItem interface.
          this.itemStore.saveItem(item.detail, () => {
            // test prefix to indicate this is used for testing only.
            item.element.classList.add('test-icon-cached');
          });
          break;

        case 'edititem':
          var icon = e.detail;

          LazyLoader.load('js/edit_group.js', () => {
            groupEditor.edit(icon);
          });
          break;

        case 'gaiagrid-iconbloberror':
          // Attempt to redownload this icon at some point in the future
          this._iconsToRetry.push(e.detail.identifier);
          break;

        case 'gaiagrid-attention':
          var offsetTop = this.grid.offsetTop;
          var scrollTop = window.scrollY;
          var gridHeight = document.body.clientHeight;

          // In edit mode, the grid is obscured by the edit header, whose
          // size matches the offsetTop of the grid.
          if (this.grid._grid.dragdrop.inEditMode) {
            gridHeight -= offsetTop;
          } else {
            scrollTop -= offsetTop;
          }

          // Try to nudge scroll position to contain the item.
          var rect = e.detail;
          if (scrollTop + gridHeight < rect.y + rect.height) {
            scrollTop = (rect.y + rect.height) - gridHeight;
          }
          if (scrollTop > rect.y) {
            scrollTop = rect.y;
          }

          if (!this.grid._grid.dragdrop.inEditMode) {
            scrollTop += offsetTop;
          }

          if (scrollTop !== window.scrollY) {
            // Grid hides overflow during dragging and normally only unhides it
            // when it finishes. However, this causes smooth scrolling not to
            // work, so remove it early.
            document.body.style.overflow = '';

            // We need to make sure that this smooth scroll happens after
            // a style flush, and also after the container does any
            // size-changing, otherwise it will stop the in-progress scroll.
            // We do this using a nested requestAnimationFrame.
            requestAnimationFrame(() => { requestAnimationFrame(() => {
              window.scrollTo({ left: 0, top: scrollTop, behavior: 'smooth'});
            });});
          }
          break;

        case 'gaiagrid-resize':
          var height = e.detail;
          var oldHeight = this.grid.clientHeight;

          if (this.gridResizeTimeout !== null) {
            clearTimeout(this.gridResizeTimeout);
            this.gridResizeTimeout = null;
          }

          if (height < oldHeight) {
            // Make sure that if we're going to shrink the grid so that exposed
            // area is made inaccessible, we scroll it out of view first.
            var viewHeight = document.body.clientHeight;
            var scrollBottom = window.scrollY + viewHeight;
            var padding = window.getComputedStyle ?
              parseInt(window.getComputedStyle(this.grid).paddingBottom) : 0;
            var maxScrollBottom = height + this.grid.offsetTop + padding;

            if (scrollBottom >= maxScrollBottom) {
              // This scrollTo needs to happen after the height style
              // change has been processed, or it will be overridden.
              // Ensure this by wrapping it in a nested requestAnimationFrame.
              requestAnimationFrame(() => { requestAnimationFrame(() => {
                window.scrollTo({ left: 0, top: maxScrollBottom - viewHeight,
                                  behavior: 'smooth' });
              });});
            }
          }

          if (height === oldHeight) {
            break;
          }

          // Although the height is set immediately, a CSS transition rule
          // means it's actually delayed by 0.5s, giving any scrolling
          // animations time to finish.
          this.grid.style.height = height + 'px';
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

        case 'editmode-start':
          // The below property in verticalhome's stylesheet is
          // always overriden by a scoped style.
          // Only inline-style can get higher specificity than a scoped style,
          // so the property is written as inline way.
          //
          // 'transform 0.25s' is from the original property in gaia-grid-rs.
          // ( shared/elements/gaia_grid_rs/style.css )
          //
          // 'height 0s 0.5s' is to apply collapsing animation in edit mode.
          this.grid.style.transition = this.EDIT_MODE_TRANSITION_STYLE;
          break;

        case 'editmode-end':
          // Retore the blank transtion property back.
          this.grid.style.transition = '';
          break;

        case 'keydown':
          if (this.inMoreApps){
            MoreAppsNavigation.handleEvent(e);
          }else{
            this.pinnedAppsNavigation.handleEvent(e);
          }
          break;

        // A hashchange event means that the home button was pressed.
        // The system app changes the hash of the homescreen iframe when it
        // receives a home button press.
        case 'hashchange':
          this.hideMoreApps();
          this.pinnedAppsNavigation.reset();
          this.clock.show();
          this.clock.start();

          // The group editor UI will be hidden by itself so returning...
          var editor = exports.groupEditor;
          if (editor && !editor.hidden) {
            return;
          }

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

          window.scrollTo({left: 0, top: 0, behavior: 'smooth'});
      }
    }
  };

  // Dummy configurator
  exports.configurator = {
    getPinnedApps: function() {
      return [];
    },
    getSingleVariantApp: function() {
      return {};
    },
    get isSingleVariantReady() {
      return true;
    },
    get isSimPresentOnFirstBoot() {
      return false;
    },
    getItems: function(role) {
      return {};
    }
  };
  exports.app = new App();
  exports.app.init();

}(window));
