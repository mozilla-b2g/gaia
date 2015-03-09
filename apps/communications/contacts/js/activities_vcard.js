'use strict';
/* global LazyLoader, VCardReader, Contacts */
/* exported VcardActivityHandler */

var VcardActivityHandler = (function() {
  var handle = function(activity, parentHandler) {
    const DEPENDENCIES = '/shared/js/contacts/import/utilities/vcard_reader.js';
    LazyLoader.load(DEPENDENCIES, function () {
      getvCardReader(activity.source.data.blob).then(readvCard, (err) => {
        console.error('Error while getting vCard reader:', err);
        Contacts.cancel();
      });
    });

    function getvCardReader(blob) {
      return new Promise((resolve, reject) => {
        var fileReader = new FileReader();
        fileReader.readAsText(blob);
        fileReader.onloadend = function() {
          resolve(new VCardReader(fileReader.result));
        };
        fileReader.onerror = function() {
          console.error('The blob could not be read as a file.');
          reject(fileReader.error);
        };
      });
    }

    function readvCard(vCardReader) {
      var firstContact;
      var cursor = vCardReader.getAll();
      cursor.onsuccess = function(event) {
        var contact = event.target.result;
        // We check if there is only one contact to know what function
        // we should call. If not, we render the contacts one by one.
        if (contact) {
          if (!firstContact) {
            firstContact = contact;
            cursor.continue();
          } else {
            render([firstContact, contact], activity, cursor);
          }
        } else if (firstContact) {
          renderOneContact(firstContact, activity);
        }
      };
    }

    function renderOneContact(contact, activity) {
      parentHandler.mozContactParam = contact;
      var data = activity.source.data;
      data.params = {
        'mozContactParam': true
      };

      // Here we should read a param like allowSave to allow the contact to be
      // saved or not. Right now the user can always save.
      // More info in bug 1138371.
      parentHandler.launch_activity(activity, 'view-contact-form');
    }

    function getFileName(path) {
      var barIndex = path.lastIndexOf('/');
      if (barIndex > -1) {
        path = path.substring(barIndex + 1);
      }
      return path;
    }

    function render(contacts, activity, cursor) {
      parentHandler.launch_activity(activity, 'multiple-select-view');
      const DEPENDENCIES = [
        '/contacts/js/views/multiple_select.js'
      ];
      LazyLoader.load(DEPENDENCIES, function() {
        var filename = getFileName(activity.source.data.filename);
        Contacts.MultipleSelect.init();
        Contacts.MultipleSelect.render(contacts, cursor, filename);
      });
    }
  };

  return {
    handle: handle
  };
})();
