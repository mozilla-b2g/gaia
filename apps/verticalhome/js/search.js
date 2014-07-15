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

    var input = document.getElementById('search');
    input.addEventListener('click', this.open.bind(this));
    // Prevent the context menu from appearing as we will not allow
    // long-tapping on the search bar later in 2.1.
    input.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
    });
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
      window.scrollTo(0, 0);
      e.stopPropagation();
      e.preventDefault();

      if (!this.connected) {
        this.pendingRender = true;
        return;
      }

      this._port.postMessage({action: 'render'});
    }
  };

  exports.search = new Search();

})(window);
