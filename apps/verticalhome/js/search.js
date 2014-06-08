/* global appManager */

(function(exports) {
  'use strict';

  /**
   * Search handles the code to launch the search app from the homescreen.
   * Home2 will contain a temporary search box in markup until we have the full
   * rocketbar experience. This code is responsible for sending the IAC message
   * to the system app to launch the search app.
   */
  function Search() {
    this._port = null;
    this.connected = false;
    this.pendingRender = false;

    if (!appManager.app) {
      window.addEventListener('appmanager-ready', function onReady() {
        window.removeEventListener('appmanager-ready', onReady);
        this.onAppReady();
      }.bind(this));
    } else {
      this.onAppReady();
    }

    this.input = document.getElementById('search');
    this.input.addEventListener('touchstart', this);
    window.addEventListener('gaiagrid-dragdrop-begin', this);
    window.addEventListener('gaiagrid-dragdrop-finish', this);
  }

  Search.prototype = {
    onAppReady: function onAppReady() {
      appManager.app.connect('search-results').then(
        function onConnectionAccepted(ports) {
          ports.forEach(function(port) {
            this._port = port;
          }.bind(this));
          this.connected = true;
          if (this.pendingRender) {
            this.open();
          }
        }.bind(this),
        function onConnectionRejected() {}
      );
    },

    /**
     * Sends a message to open the rocketbar.
     * @memberof Search.prototype
     */
    open: function openRocketbar(e) {
      document.querySelector('.scrollable').scrollTop = 0;
      e.stopPropagation();
      e.preventDefault();

      if (!this.connected) {
        this.pendingRender = true;
        return;
      }

      this._port.postMessage({action: 'render'});
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
        case 'touchstart':
          this.open(e);
          break;

        case 'gaiagrid-dragdrop-begin':
          this.input.removeEventListener('touchstart', this);
          break;

        case 'gaiagrid-dragdrop-finish':
          this.input.addEventListener('touchstart', this);
          break;
      }
    }
  };

  exports.search = new Search();

})(window);
