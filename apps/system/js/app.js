/* global BaseModule, LazyLoader, applications */
'use strict';

(function(exports) {
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
      this._lazyLoad();
    },
    bootstrap: function() {
      if (this._booted) {
        return;
      }
      this._booted = true;
      window.settingsCore = BaseModule.instantiate('SettingsCore');
      window.settingsCore.start();
      window.launcher = BaseModule.instantiate('Launcher');
      Promise.all([
        applications.waitForReady(), // There is too many operations
                                     // need to wait application ready.
        window.launcher.start()
      ]).then(function() {
        window.core = BaseModule.instantiate('Core');
        window.core && window.core.start().then(() => {
          document.body.setAttribute('ready-state', 'fullyLoaded');
          window.performance.mark('fullyLoaded');
        }).catch((err) => {
          console.error(err);
        });
      });
    },
    _lazyLoad: function() {
      LazyLoader.load(this.FILES).then(function() {
        this.bootstrap();
      }.bind(this)).catch(function(err) {
        console.log(err);
      });
    }
  };

  exports.App = App;
}(window));
