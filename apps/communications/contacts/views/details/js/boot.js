/* global DetailsUI, DetailsController, LazyLoader, ContactsService */
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


    function getParams() {
      var params = {};
      var raw = window.location.search.split('?')[1];
      var pairs = raw.split('&');
      for (var i = 0; i < pairs.length; i++) {

        var data = pairs[i].split('=');
        params[data[0]] = data[1];
      }
      return params;
    }

    function renderContact(id) {
      return new Promise(function(resolve, reject) {
        ContactsService.get(params.contact, function onSuccess(savedContact) {
          ContactsService.getCount(count => {
            resolve(savedContact, count);
          });
        }, function onError() {
          console.error('Error retrieving contact');
          reject();
        });
      });
    }

    // TODO: Implement handler for open Vcards

    // Get action from URL (new or update)
    var params = getParams();
    if (params.contact) {
      renderContact(params.contact).then(function(savedContact, count) {
        DetailsController.setContact(params.contact);
        DetailsUI.render(savedContact, count, false);
        window.addEventListener(
          'pageshow',
          function checkIfUpdate() {
            var reason = sessionStorage.getItem('reason');
            switch(reason) {
              case 'update':
                renderContact(params.contact).then(function(contact, count) {
                  DetailsUI.render(contact, count, false);
                });
                break;
              case 'remove':
                setTimeout(function() {
                  window.history.back();
                }, 0);
                break;
            }
          }
        );
      });
    }

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
