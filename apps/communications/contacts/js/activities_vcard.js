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
      var cursor = vCardReader.getAll();
      cursor.onsuccess = function(event) {
        var contact = event.target.result;
        render([contact], activity, cursor);
      };
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
        var name;
        if (activity.source.data.filename) {
          name = getFileName(activity.source.data.filename);
        } else {
          name = activity.source.data.src;
        }
        Contacts.MultipleSelect.init();
        Contacts.MultipleSelect.render(contacts, cursor, name);
      });
    }
  };

  return {
    handle: handle
  };
})();
