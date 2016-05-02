/* global SpatialNavigation, LazyLoader */
'use strict';

window.SpatialNavigationHelper = {
  _enabled: false,
  _SpatialNavigation: null,

  init: function() {
    return new Promise((resolve, reject) => {
      var lock = navigator.mozSettings.createLock();
      var setting = lock.get('settings-app.spatial-navigation.enabled');
      setting.onsuccess = function () {
        resolve(setting.result['settings-app.spatial-navigation.enabled']);
      };
      setting.onerror = function () {
        console.error('An error occured: ' + setting.error);
        reject(setting.error);
      };
    }).then(enabledSpatialNavigation => {
      if (enabledSpatialNavigation) {
        LazyLoader.load([
          '../shared/js/spatial_navigation.js',
          '../shared/js/smart-screen/shared_utils.js'
        ], () => {
          document.getElementsByTagName('body')[0]
            .classList.add('spatial-navigation');
          SpatialNavigation.init();
          const SN_ROOT = 'body.spatial-navigation .current:not(.dialog)';
          // Define the navigable elements.
          SpatialNavigation.add({
            id: 'current-section',
            selector: SN_ROOT + ' .action-button,' +
              SN_ROOT + ' gaia-header button,' +
              SN_ROOT + ' li a.menu-item,' +
              SN_ROOT + ' li .button,' +
              SN_ROOT + ' li button,' +
              SN_ROOT + ' li input,' +
              SN_ROOT + ' ul.wifi-availableNetworks li:not([data-state]),' +
              SN_ROOT + ' ul.bluetooth-paired-devices li:not([data-state]),' +
              SN_ROOT + ' ul.bluetooth-devices li:not([data-state]),' +
              SN_ROOT + ' li gaia-radio,' +
              SN_ROOT + ' li gaia-checkbox,' +
              SN_ROOT + ' li gaia-switch',
            enterTo: 'last-focused'
          });
          this._enabled = enabledSpatialNavigation;
          SpatialNavigation.makeFocusable();
          SpatialNavigation.focus();
        });
      }
    });
  },

  add: function(param) {
    if (this._enabled) {
      SpatialNavigation.add(param);
    }
  },

  remove: function(snId) {
    if (this._enabled) {
      SpatialNavigation.remove(snId);
    }
  },

  isEnabled: function() {
    return this._enabled;
  },

  makeFocusable: function() {
    if (this._enabled) {
      SpatialNavigation.makeFocusable();
    }
  },

  focus: function(snId) {
    if (this._enabled) {
      SpatialNavigation.focus(snId);
    }
  }
};
