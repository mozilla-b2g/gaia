require(['config/require'], function() {
  'use strict';

  define('boot', function(require) {
    // The following are the scripts used by many other scripts. We load them
    // at once here.
    require('shared/settings_listener');
    require('modules/mvvm/observable');
    require('modules/mvvm/observable_array');
    require('modules/base/event_emitter');

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

      var initialPanelHandler = window.LaunchContext.initialPanelHandler;
      if (initialPanelHandler) {
        initialPanelHandler.release();
        var pendingTargetPanel = initialPanelHandler.pendingTargetPanel;
        // XXX: In call item,
        // we need special logic for navigating to specific panels.
        switch (pendingTargetPanel) {
          case 'call':
            var mozMobileConnections = navigator.mozMobileConnections;
            // If DSDS phone, we have to let users choose simcard
            if (mozMobileConnections && mozMobileConnections.length > 1) {
              // If the device support dsds,
              // then navigate to 'call-iccs' panel
              pendingTargetPanel = 'call-iccs';
            }
            SettingsService.navigate(pendingTargetPanel);
            break;
          default:
            if (pendingTargetPanel) {
              SettingsService.navigate(pendingTargetPanel);
            }
            break;
        }
      }

      window.removeEventListener('panelready', onPanelReady);

      // XXX: Even the panel has been displayed but the content may still not
      //      stable yet. This is a estimated timing of visually complete. We
      //      should implement other mechanism waiting for all content ready.
      window.performance.mark('visuallyLoaded');

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
