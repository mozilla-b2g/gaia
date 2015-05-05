/* global BaseModule, LazyLoader, applications */
'use strict';

(function(exports) {
  /**
   * The entry point of the whole system app.
   * It's duty is to prepare everything ready to launch
   * the application core (core.js).
   *
   * Core could run without App, but it is expected to be slower
   * because App will prepare the launch config for it with
   * Launcher's help (launcher.js).
   *
   * In Launcher it will read the launch configurations and put
   * some requests according to the config in the Service. When
   * the relative modules which are started by Core is started,
   * they could just fetch the launch config sychronously to
   * fasten to launch progress.
   *
   * If Launcher does not prepare the value for them,
   * the modules who are started by the Core will still get
   * the values asynchronously.
   */
  var App = function() {};
  App.prototype = {
    // TODO: decrease the files here and move them into specific loader
    FILES: [
      'js/wake_lock_manager.js',
      'js/base_ui.js',
      'js/base_icon.js',
      'js/browser_config_helper.js',
      'js/browser_frame.js',
      'js/app_window.js',
      'js/attention_window.js',
      'js/system_dialog.js',
      'js/action_menu.js',
      'js/core.js',
      'js/launcher.js',
      'js/settings_core.js',
      'js/modal_dialog.js',
      'shared/js/event_safety.js',
      'shared/js/mobile_operator.js',
      'shared/js/screen_layout.js',
      'shared/js/settings_listener.js',
      'shared/js/async_storage.js',
      'shared/js/manifest_helper.js'
    ],
    start: function() {
      window.performance.mark('loadEnd');
      return LazyLoader.load(this.FILES).then(() => {
        return this.bootstrap();
      });
    },
    bootstrap: function() {
      if (this._booted) {
        throw new Error('App: bootstrap should not be called twice.');
      }
      this._booted = true;
      window.settingsCore = BaseModule.instantiate('SettingsCore');
      window.settingsCore.start();
      window.launcher = BaseModule.instantiate('Launcher');
      return Promise.all([
        // XXX:
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=1161489
        // Consider to move applications.start() into Core or AppCore
        // but it may miss the mozChromeEvent to tell us application
        // is ready to query.
        applications.waitForReady(),
        window.launcher.start()
      ]).then(() => {
        window.core = BaseModule.instantiate('Core');
        return window.core.start().then(() => {
          // To let integration test know we are ready to test.
          document.body.setAttribute('ready-state', 'fullyLoaded');
          window.performance.mark('fullyLoaded');
        });
      });
    }
  };

  exports.App = App;
}(window));
