'use strict';
/* global asyncStorage, MozActivity, SettingsListener */

(function(exports) {

  var isManuallyPrivate = window.location.search.includes('private=1');
  var isManuallyRegular = window.location.search.includes('private=0');
  var isPrivateByDefault = false;

  SettingsListener.observe('browser.private.default', false, function (value) {
    if (value) {
      isPrivateByDefault = true;
    } else {
      isPrivateByDefault = false;
    }

    exports.newtab.togglePrivacyMode();
  });

  /**
   * The main Newtab page object.
   * Instantiates places to populate history and top sites.
   */
  function Newtab() {
    // Initialize the parent port connection
    var self = this;
    navigator.mozApps.getSelf().onsuccess = function() {
      var app = this.result;
      app.connect('search-results').then(function onConnAccepted(ports) {
        ports.forEach(function(port) {
          self._port = port;
        });
        self.init();
      }, function onConnectionRejected(reason) {
        console.log('Error connecting: ' + reason + '\n');
      });
    };

    this.togglePrivacyMode();
  }

  Newtab.prototype = {

    /**
     * A reference to the Places provider.
     */
    provider: null,

    /**
     * Initializes top sites and history.
     */
    init: function() {
      this.provider.init();
      this.provider.searchObj = this;
    },

    /**
     * Requests a screenshot of the page from the system app.
     */
    requestScreenshot: function(url) {
      this._port.postMessage({
        'action': 'request-screenshot',
        'url': url
      });
    },

    /**
     * Requests that the system app opens a new private window.
     */
    requestPrivateWindow: function() {
      this._port.postMessage({
        'action': 'private-window'
      });
    },

    /**
     * Toggles the privacy mode.
     *
     * When private browsing _IS_ the default and we _ARE NOT_ manually being
     * regular or when private browsing _IS NOT_ the default and we _ARE_
     * manually bring private: Makes this window look like a private window by
     * applying the necessary theme color and background. The window can't be
     * truly private, otherwise we wouldn't have access to local history and
     * bookmarks.
     *
     * When private browsing _IS_ the default and we _ARE_ manually regular:
     * Makes this window look normal by removing private theme settings.
     */
    togglePrivacyMode: function() {
      var themeMeta = document.querySelector('meta[name="theme-color"]');
      var themeColor = document.createElement('meta');

      if ((isPrivateByDefault && !isManuallyRegular) ||
          (!isPrivateByDefault && isManuallyPrivate)) {

        if (themeMeta) {
          document.head.removeChild(themeMeta);
        }

        themeColor.setAttribute('name', 'theme-color');
        themeColor.setAttribute('content', '#392E54');
        document.head.appendChild(themeColor);
        document.body.classList.add('private');

        // Show the private dialog if needed.
        asyncStorage.getItem('shouldSuppressPrivateDialog', value => {
          if (value) {
            return;
          }

          this.privateBrowserDialog = document.getElementById(
            'private-window-dialog');
          this.privateBrowserDialog.removeAttribute('hidden');

          this.privateBrowserDialogClose = document.getElementById(
            'private-window-hide-dialog');
          this.privateBrowserDialogClose.addEventListener('click', this);

          this.privateBrowserLearnMore = document.getElementById(
            'private-learn-more');
          this.privateBrowserLearnMore.addEventListener('click', this);
        });
      }

      if (isPrivateByDefault && isManuallyRegular) {
        if (themeMeta) {
          document.head.removeChild(themeMeta);
        }
      }
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.target) {
        case this.privateBrowserDialogClose:
          this.hidePrivateBrowserDialog();
          break;
        case this.privateBrowserLearnMore:
          this.learnAboutPrivateBrowsing(e);
          break;
      }
    },

    /**
     * Hides the private browser dialog.
     */
    hidePrivateBrowserDialog: function() {
      this.privateBrowserDialog.setAttribute('hidden', true);

      // Set async storage value if we have checked the box so we don't
      // attempt to show it again.
      var checkbox = this.privateBrowserDialog.querySelector('gaia-checkbox');
      if (checkbox.checked) {
        asyncStorage.setItem('shouldSuppressPrivateDialog', true);
      }
    },

    /**
     * Opens the learn more dialog.
     */
    learnAboutPrivateBrowsing: function(e) {
      e.preventDefault();
      /* jshint nonew: false */
      new MozActivity({
        name: 'view',
        data: {
          type: 'url',
          url: e.target.href
        }
      });
    }
  };

  exports.newtab = new Newtab();

  /**
   * Stub search object to populate providers.
   * TODO: We should split up the places provider into some data layer where
   * the search or newtab page could leverage it.
   */
  exports.Search = {
    provider: function(provider) {
      exports.newtab.provider = provider;
    },

    /**
     * Opens a browser to a URL.
     * @param {String} url The url to navigate to
     */
    navigate: function(url) {
      window.open(url, '_blank', 'remote=true');
    }
  };

})(window);
