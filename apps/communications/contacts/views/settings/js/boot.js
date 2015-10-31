/* global LazyLoader */
/* global fbLoader */
/* global SettingsUI */
/* global SettingsController */

'use strict';

window.addEventListener('DOMContentLoaded', function() {
  LazyLoader.load([
    '/shared/js/l10n.js',
    '/shared/pages/import/js/curtain.js'
    ], function() {
      // TODO Add if needed
      LazyLoader.load([
        document.getElementById('settings-wrapper'),
        document.getElementById('confirmation-message'),
        document.getElementById('statusMsg')
      ], function() {
      });
  });
});

window.onload = function() {
  var dependencies = [
    // style
    '/contacts/style/overlay.css',
    // shared
    '/shared/js/async_storage.js',
    '/shared/js/confirm.js',
    '/shared/js/l10n_date.js',
    '/shared/js/text_normalizer.js',
    // import
    '/shared/js/contacts/import/utilities/vcard_parser.js',
    '/shared/js/contacts/import/utilities/overlay.js',
    '/shared/js/contacts/import/utilities/status.js',
    '/shared/js/contacts/import/utilities/sdcard.js',
    '/shared/js/contacts/utilities/event_listeners.js',
    // utilities
    '/contacts/js/utilities/sim_dom_generator.js',
    '/contacts/js/utilities/icc_handler.js',
    '/contacts/js/utilities/normalizer.js',
    '/contacts/js/utilities/cookie.js',
    '/contacts/js/service_extensions.js',
    '/contacts/js/navigation.js',
    '/contacts/js/activities.js',
    '/contacts/js/loader.js',
    // settings
    '/contacts/views/settings/js/settings_ui.js',
    '/contacts/views/settings/js/main_navigation.js',
    '/contacts/views/settings/js/settings_controller.js',
    '/contacts/services/contacts.js'
  ];

  LazyLoader.load(['/contacts/js/fb_loader.js'], function() {
    fbLoader.load();

    LazyLoader.load(dependencies, function() {
      SettingsUI.init();
      SettingsController.init();
    });
  });
};
