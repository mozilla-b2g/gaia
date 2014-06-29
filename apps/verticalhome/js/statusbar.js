'use strict';

/* global app */
/* global appManager */

(function(exports) {

  const APPEARANCE = {
    OPAQUE: 'opaque',
    SEMI_TRANSPARENT: 'semi-transparent'
  };

  function StatusBar() {
    this.scrollable = document.querySelector('.scrollable');
    this.threshold = document.getElementById('search').clientHeight;

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
        case 'collection-launch':
        case 'collections-create-begin':
          this.setAppearance(APPEARANCE.OPAQUE);
          break;
        case 'gaiagrid-editmode-start':
          window.removeEventListener('context-menu-open', this);
          window.removeEventListener('context-menu-close', this);
          /* falls through */
        case 'context-menu-open':
          this.scrollable.removeEventListener('scroll', this);
          this.setAppearance(APPEARANCE.OPAQUE);
          break;
        case 'gaiagrid-editmode-end':
          window.addEventListener('context-menu-open', this);
          window.addEventListener('context-menu-close', this);
          /* falls through */
        case 'context-menu-close':
          this.scrollable.addEventListener('scroll', this);
          // We still want to toggle the appearance of the scroll bar on exit
          /* falls through */
        case 'collection-close':
        case 'collections-create-return':
        case 'scroll':
          var scrollTop = this.scrollable.scrollTop;
          this.setAppearance(scrollTop > this.threshold ? APPEARANCE.OPAQUE :
                                         APPEARANCE.SEMI_TRANSPARENT);
          break;
      }
    },

    onAppReady: function() {
      appManager.app.connect('change-appearance-statusbar').then(
        function ok(ports) {
          ports.forEach(function(port) {
            this.port = port;
          }.bind(this));

          var grid = app.grid;
          this.scrollable.addEventListener('scroll', this);
          grid.addEventListener('collection-launch', this);
          grid.addEventListener('collection-close', this);
          grid.addEventListener('editmode-start', this);
          grid.addEventListener('editmode-end', this);
          window.addEventListener('collections-create-begin', this);
          window.addEventListener('collections-create-return', this);
          window.addEventListener('context-menu-close', this);
          window.addEventListener('context-menu-open', this);
          this.setAppearance(APPEARANCE.SEMI_TRANSPARENT);
        }.bind(this), function fail(reason) {
          console.error('Cannot notify changes of appearance: ', reason);
        }
      );
    },

    setAppearance: function(value) {
      if (this.appearance === value) {
        return;
      }

      this.appearance = value;
      this.port.postMessage(value);
    }
  };

  exports.statusBar = new StatusBar();

}(window));
