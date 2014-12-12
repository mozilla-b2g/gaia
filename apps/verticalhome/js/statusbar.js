'use strict';

/* global app */
/* global appManager */

(function(exports) {

  // The delay of the collections frame animating in or out.
  // We need to wait this many ms before making fullscreen requests
  // or we will receive a frame not focused error.
  const collectionFocusDelay = 300;

  const APPEARANCE = {
    OPAQUE: 'opaque',
    SEMI_TRANSPARENT: 'semi-transparent'
  };

  function StatusBar() {
    this.threshold = 0;

    if (!appManager.app) {
      window.addEventListener('appmanager-ready', function onReady() {
        window.removeEventListener('appmanager-ready', onReady);
        this.onAppReady();
      }.bind(this));
    } else {
      this.onAppReady();
    }
  }

  StatusBar.prototype = {
    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
        case 'bookmark-edit':
        case 'collection-edit':
          // Exit fullscreen when launching an activity from edit mode.
          setTimeout(() => {
            document.mozCancelFullScreen();
          }, collectionFocusDelay);
          break;
        case 'bookmark-edit-end':
        case 'collection-edit-end':
          // Re-enter fullscreen when launching an activity from edit mode.
          setTimeout(() => {
            document.documentElement.mozRequestFullScreen();
          }, collectionFocusDelay);
          break;
        case 'collection-launch':
        case 'collections-create-begin':
          this.setAppearance(APPEARANCE.OPAQUE);
          break;
        case 'editmode-start':
          window.removeEventListener('context-menu-open', this);
          window.removeEventListener('context-menu-close', this);
          window.removeEventListener('gaia-confirm-open', this);
          window.removeEventListener('gaia-confirm-close', this);
          app.grid.addEventListener('bookmark-edit', this);
          app.grid.addEventListener('bookmark-edit-end', this);
          app.grid.addEventListener('collection-edit', this);
          app.grid.addEventListener('collection-edit-end', this);
          /* falls through */
        case 'context-menu-open':
        case 'gaia-confirm-open':
          window.removeEventListener('scroll', this);
          this.setAppearance(APPEARANCE.OPAQUE);
          break;
        case 'editmode-end':
          window.addEventListener('context-menu-open', this);
          window.addEventListener('context-menu-close', this);
          window.addEventListener('gaia-confirm-open', this);
          window.addEventListener('gaia-confirm-close', this);
          app.grid.removeEventListener('bookmark-edit', this);
          app.grid.removeEventListener('bookmark-edit-end', this);
          app.grid.removeEventListener('collection-edit', this);
          app.grid.removeEventListener('collection-edit-end', this);
          /* falls through */
        case 'context-menu-close':
        case 'gaia-confirm-close':
          window.addEventListener('scroll', this);
          // We still want to toggle the appearance of the scroll bar on exit
          /* falls through */
        case 'collection-close':
        case 'collections-create-return':
        case 'scroll':
          this.setAppearance(this.calculateAppearance());
          break;
        case 'visibilitychange':
          // If the document is not hidden, set appearance based on scroll top.
          if (document.hidden) {
            break;
          }
          // Note: we always want to set statusbar transparency on
          // visibilitychange, so we remove the cached appearance value.
          this.appearance = null;
          this.setAppearance(this.calculateAppearance());
          break;
      }
    },

    onAppReady: function() {
      var grid = app.grid;
      window.addEventListener('scroll', this);
      grid.addEventListener('collection-launch', this);
      grid.addEventListener('collection-close', this);
      grid.addEventListener('editmode-start', this);
      grid.addEventListener('editmode-end', this);
      window.addEventListener('collections-create-begin', this);
      window.addEventListener('collections-create-return', this);
      window.addEventListener('context-menu-close', this);
      window.addEventListener('context-menu-open', this);
      window.addEventListener('gaia-confirm-open', this);
      window.addEventListener('gaia-confirm-close', this);
      window.addEventListener('visibilitychange', this);
      this.setAppearance(APPEARANCE.SEMI_TRANSPARENT);
    },

    /**
     * Calculate the appearance of the status bar based on scroll state.
     */
    calculateAppearance: function() {
      return window.scrollY > this.threshold ?
        APPEARANCE.OPAQUE : APPEARANCE.SEMI_TRANSPARENT;
    },

    setAppearance: function(value) {
      if (this.appearance === value) {
        return;
      }

      this.appearance = value;

      var meta = document.head.querySelector('meta[name="theme-color"]');
      if (value == APPEARANCE.OPAQUE) {
        meta.content = 'black';
      } else {
        meta.content = 'rgba(0,0,0,0.1)';
      }
    }
  };

  exports.statusBar = new StatusBar();

}(window));
