require(['config/require'], function() {
  'use strict';

  define('boot', function(require) {
    // The following are the scripts used by many other scripts. We load them
    // at once here. These should be move to the dependency of each panel in the
    // future.
    require('utils');
    require('shared/settings_listener');

    var SettingsService = require('modules/settings_service');
    var ScreenLayout = require('shared/screen_layout');
    var Settings = require('settings');

    function isInitialPanel(panel) {
      if (Settings.isTabletAndLandscape()) {
        return panel === Settings.initialPanelForTablet;
      } else {
        return panel === ('#' + window.LaunchContext.initialPanelId);
      }
    }

    window.addEventListener('panelready', function onPanelReady(e) {
      if (!isInitialPanel(e.detail.current)) {
        return;
      }

      var bluetoothMenuItem =
        document.querySelector('#root .menuItem-bluetooth');
      if (bluetoothMenuItem) {
        bluetoothMenuItem.setAttribute('href', '#');
      }

      var initialPanelHandler = window.LaunchContext.initialPanelHandler;
      if (initialPanelHandler) {
        initialPanelHandler.release();
        var pendingTargetPanel = initialPanelHandler.pendingTargetPanel;
        // XXX: special logic for navigating to bluetooth panels
        if (pendingTargetPanel === 'bluetooth') {
          require(['modules/bluetooth/version_detector'], (versionDetector) => {
            var version = versionDetector.getVersion();
            if (version === 1) {
              // navigate old bluetooth panel..
              SettingsService.navigate('bluetooth');
            } else if (version === 2) {
              // navigate new bluetooth panel..
              SettingsService.navigate('bluetooth_v2');
            }
          });
        } else if (pendingTargetPanel) {
          SettingsService.navigate(pendingTargetPanel);
        }
      }

      window.removeEventListener('panelready', onPanelReady);

      // XXX: Even the panel has been displayed but the content may still not
      //      stable yet. This is a estimated timing of visually complete. We
      //      should implement other mechanism waiting for all content ready.
      window.performance.mark('visuallyLoaded');
      window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));

      // Activate the animation.
      document.body.dataset.ready = true;
    }, false);

    window.addEventListener('telephony-settings-loaded',
      function onTelephonySettingsLoaded() {
        window.removeEventListener('telephony-settings-loaded',
          onTelephonySettingsLoaded);

        // The loading of telephony settings is dependent on being idle,
        // once complete we are safe to declare the settings app as loaded
        window.performance.mark('fullyLoaded');
        window.dispatchEvent(new CustomEvent('moz-app-loaded'));
      });

    /**
     * In two column layout, the root panel should not be deactivated. We pass
     * the id of the root panel to SettingsService so that it won't deactivate
     * the root panel when in two column.
     * XXX: Currently we don't separate the navigation logic of one column and
     *      two column layout, so that the root panel will not be deactivated
     *      in one column layout.
     */
    SettingsService.init({
      rootPanelId: 'root',
      context: window.LaunchContext
    });

    var options = {
      SettingsService: SettingsService,
      ScreenLayout: ScreenLayout
    };
    Settings.init(options);

    // Tell audio channel manager that we want to adjust the notification
    // channel if the user press the volumeup/volumedown buttons in Settings.
    if (navigator.mozAudioChannelManager) {
      navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
    }
  });

  require(['boot']);
});
