/*global requirejs, TestUrlResolver */
'use strict';

// Set up loading of scripts, but only if not in tests, which set up their own
// config.
if (typeof TestUrlResolver === 'undefined') {
  requirejs.config({
    // waitSeconds is set to the default here; the build step rewrites it to 0
    // in build/email.build.js so that we never timeout waiting for modules in
    // production. This is important when the device is under super-low-memory
    // stress, as it may take a while for the device to get around to loading
    // things email needs for background tasks like periodic sync.
    waitSeconds: 7,
    baseUrl: 'js',
    paths: {
      l10nbase: '../shared/js/l10n',
      l10ndate: '../shared/js/l10n_date',
      style: '../style',
      shared: '../shared'
    },
     map: {
      '*': {
        'api': 'ext/main-frame-setup'
      }
    },
    shim: {
      l10ndate: ['l10nbase'],

      'shared/js/component_utils': {
        exports: 'ComponentUtils'
      },

      'shared/elements/gaia_checkbox/script': {
        exports: 'GaiaCheckbox'
      },

      'shared/elements/gaia_switch/script': {
        exports: 'GaiaSwitch'
      },

      'shared/js/mime_mapper': {
        exports: 'MimeMapper'
      },

      'shared/js/notification_helper': {
        exports: 'NotificationHelper'
      },

      'shared/js/accessibility_helper': {
        exports: 'AccessibilityHelper'
      }
    },
    config: {
      template: {
        tagToId: function(tag) {
           return tag.replace(/^cards-/, 'cards/').replace(/-/g, '_');
        }
      }
    },
    definePrim: 'prim'
  });
}

// Tell audio channel manager that we want to adjust the notification channel if
// the user press the volumeup/volumedown buttons in Email.
if (navigator.mozAudioChannelManager) {
  navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
}

// startupOnModelLoaded can be set to a function in html_cache_restore. In that
// case, html_cache_restore needs to know the model state, if there is an
// account, before proceeding with the startup view to select.
if (window.startupOnModelLoaded) {
  requirejs(['console_hook', 'model'], function(hook, model) {
    model.init();
    window.startupOnModelLoaded(model, function() {
      require(['mail_app']);
    });
  });
} else {
  // Run the app module, bring in fancy logging
  requirejs(['console_hook', 'mail_app']);
}
