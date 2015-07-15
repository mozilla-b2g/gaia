/* global LazyLoader, VCardLoadUI, VCardLoadController, VCardHandler */
'use strict';

/*
 * This class is the one in charge of loading the minimum set of
 * resources needed for the view to load. Any other JS/CSS/Element
 * not needed in the critical path *must* be lazy loaded when needed.
 *
 * Once localization and all the basic JS/CSS/Elements are loaded,
 * we will initialize UI and Controller. Both JS classes *must* be
 * independent and will communicate through events.
 */

window.addEventListener('DOMContentLoaded', function() {
  LazyLoader.load(['/shared/js/l10n.js']).then(function() {
    LazyLoader.load([
      document.getElementById('multiple-select-view')
    ]);
  });
});

window.addEventListener('load', function() {
  var dependencies = [
    '/shared/js/contacts/import/utilities/vcard_reader.js',
    '/contacts/views/vcard_load/js/vcard_handler.js',
    '/contacts/views/vcard_load/js/vcard_load_ui.js',
    '/contacts/views/vcard_load/js/vcard_load_controller.js'
  ];

  LazyLoader.load(dependencies).then(function() {
    VCardLoadUI.init();
    VCardLoadController.init();

    navigator.mozSetMessageHandler('activity', function(activity) {
      VCardLoadController.setActivity(activity);
      VCardHandler.handle(activity)
      .then(contacts => {
        var filename = VCardHandler.getFileName(activity.source.data.filename);
        // Do Render
        VCardLoadUI.render(contacts, filename);
      });
    });

  });
});
