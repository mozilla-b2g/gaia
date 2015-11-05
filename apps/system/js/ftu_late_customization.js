/* global BaseModule */
'use strict';

/**
 * Singleton object to recieve and make available the list of
 * late customization apps
 */
(function(exports) {
  var FtuLateCustomization = function(core) {
    this.debug('ctor');
  };
  FtuLateCustomization.EVENTS = [
    'iac-ftucomms'
  ];
  FtuLateCustomization.STATES = [
    'ftuCustomizationContains'
  ];

  BaseModule.create(FtuLateCustomization, {
    name: 'FtuLateCustomization',
    appsToInstall: null,
    DEBUG: false,
    EVENT_PREFIX: 'ftucustomization',

    _start: function() {
      this.debug('_start');
    },

    _stop: function() {
      this.debug('_stop');
      this.publish('end');
      // what was the outcome?
      if (!this.appsToInstall) {
        // We never got the data from FTU
        return;
      }
      if (!this.appsToInstall.size) {
        // manifest was empty
        return;
      }
      var installedCount = Array.from(this.appsToInstall.values())
        .filter(app => {
          return (app && app.installState === 'installed');
        }).length;
      var remaining = this.appsToInstall.size - installedCount;
      if (remaining) {
        this.debug('_stop, ' + remaining + ' apps not installed');
      }
      this.appsToInstall = null;
    },

    ftuCustomizationContains: function (url) {
      return this.appsToInstall ?
          this.appsToInstall.has(url) : false;
    },

    gotInstallUrls: function(urls) {
      if (this.appsToInstall) {
        console.warn('handling iac-ftucomms, late-customization-apps '+
                    'message, appsToInstall already defined');
      }
      this.appsToInstall = new Map();
      urls.forEach(url => {
        this.appsToInstall.set(url, null);
      });
      this.debug('urls received');
      this.publish('begin', {
        manifestURLs: [...this.appsToInstall.keys()]
      });
    },

    '_handle_iac-ftucomms': function(evt) {
      var message = evt.detail;
      this.debug('_handle_iac-ftucomms, got message: ' +
                 message.type, message.urls);
      switch (message.type) {
        case 'late-customization-apps':
          this.gotInstallUrls(message.urls);
          break;
      }
    }
  });
  exports.FtuLateCustomization = FtuLateCustomization;
})(window);
