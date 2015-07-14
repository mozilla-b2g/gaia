/* global DetailsUI, DetailsController, LazyLoader, ContactsService */
'use strict';

window.addEventListener('DOMContentLoaded', function() {
  LazyLoader.load(['/shared/js/l10n.js']).then(function() {
    LazyLoader.load([
      document.getElementById('view-contact-details')
    ]).then(function() {
      // TODO Add if needed
    });
  });
});

window.onload = function() {
  var dependencies = [
    '/contacts/services/contacts.js',
    '/shared/js/l10n_date.js',
    '/shared/js/contact_photo_helper.js',
    '/shared/js/contacts/contacts_buttons.js',
    '/shared/js/text_normalizer.js',
    '/shared/js/contacts/utilities/dom.js',
    '/shared/js/contacts/utilities/templates.js',
    '/shared/js/contacts/import/utilities/misc.js',
    '/contacts/js/match_service.js',
    '/contacts/views/details/js/details_ui.js',
    '/contacts/views/details/js/details_controller.js',
    '/shared/pages/import/js/curtain.js'
  ];

  LazyLoader.load(dependencies).then(function() {
    DetailsUI.init();
    DetailsController.init();

    window.addEventListener('renderdone', function fn() {
      window.removeEventListener('renderdone', fn);
      document.body.classList.remove('hidden');
    });

    navigator.mozSetMessageHandler('activity', activity => {
      DetailsController.setActivity(activity);
      var id = activity.source.data.params.id;

      // TODO: Implement handler for open Vcards

      ContactsService.get(id, function onSuccess(savedContact) {
        ContactsService.getCount(count => {
          DetailsUI.render(savedContact, count, true);
        });
      }, function onError() {
        console.error('Error retrieving contact');
      });
    });

  });
};
