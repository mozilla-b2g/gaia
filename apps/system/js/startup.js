/* global BaseModule, LazyLoader */
'use strict';

(function() {
  var Startup = {
    // TODO: decrease the files here and move them into specific loader
    FILES: [
      'js/core.js',
      'js/launcher.js',
      'js/settings_core.js',
      'js/screen_manager.js',
      'js/browser_key_event_manager.js',
      'shared/js/async_semaphore.js',
      'js/hardware_buttons.js',
      'js/system_banner.js',
      'js/statusbar.js',
      'js/lockscreen_agent.js',
      'js/ime_menu.js',
      'shared/js/lockscreen_slide.js',
      'lockscreen/js/lockscreen_notification_builder.js',
      'js/value_selector/value_picker.js',
      'js/value_selector/spin_date_picker.js',
      'js/value_selector/value_selector.js',
      'shared/js/input_parser.js',
      'js/homescreen_window_manager.js',
      'js/homescreen_launcher.js',
      'js/search_window.js',
      'js/ftu_launcher.js',
      'js/app_window_factory.js',
      'js/app_window_manager.js',
      'js/value_selector/trusted_ui_value_selector.js',
      'js/modal_dialog.js',
      'js/browser_context_menu.js',
      'js/child_window_factory.js',
      'js/app_modal_dialog.js',
      'js/app_chrome.js',
      'js/attention_toaster.js',
      'js/app_statusbar.js',
      'js/app_transition_controller.js',
      'js/app_authentication_dialog.js',
      'js/popup_window.js',
      'js/browser_mixin.js',
      'js/wrapper_factory.js',
      'shared/js/event_safety.js',
      'js/homescreen_window.js',
      'js/global_overlay_window.js',
      'js/trusted_window.js',
      'js/wallpaper_manager.js',
      'js/layout_manager.js',
      'js/software_button_manager.js',
      'js/touch_forwarder.js',
      'js/orientation_manager.js',
      'js/hierarchy_manager.js',
      'js/system_dialog_manager.js',
      'js/input_window_manager.js',
      'js/input_layouts.js',
      'js/keyboard_manager.js',
      'js/callscreen_window.js',
      'js/secure_window.js',
      'js/lockscreen_window.js',
      'js/lockscreen_input_window.js',
      'js/input_window.js',
      'js/ime_switcher.js',
      'js/activity_window.js',
      'shared/js/mobile_operator.js',
      'shared/js/screen_layout.js'
    ],
    start: function() {
      this._lazyLoad();
    },
    bootstrap: function() {
      if (this._booted) {
        return;
      }
      this._booted = true;
      window.performance.mark('loadEnd');
      window.settingsCore = BaseModule.instantiate('SettingsCore');
      window.settingsCore.start();
      window.launcher = BaseModule.instantiate('Launcher');
      window.launcher.start().then(function() {
        window.core = BaseModule.instantiate('Core');
        window.core && window.core.start();
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

  window.Startup = Startup;

  if (document.readyState !== 'loading') {
    Startup.start();
  } else {
    document.addEventListener('readystatechange',
      function readyStateChange() {
        if (document.readyState == 'interactive') {
          document.removeEventListener('readystatechange',
            readyStateChange);
          Startup.start();
        }
      });
  }
}());
