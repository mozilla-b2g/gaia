/* global VCardReader */

(function(exports) {
  'use strict';

  function handle(activity) {
    return getvCardReader(activity.source.data.blob).then(readvCard);
  }

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
    var contacts = [];
    return new Promise(function(resolve, reject) {
      var cursor = vCardReader.getAll();
      cursor.onsuccess = function(event) {
        if (!event.target.result) {
          resolve(contacts);
          return;
        }

        contacts.push(event.target.result);
        cursor.continue();
      };

      cursor.onerror = function(event) {
        console.error('Error while retrieving cursor from vcard');
        reject();
      };
    });
  }

  function getFileName(path) {
    var barIndex = path.lastIndexOf('/');
    if (barIndex > -1) {
      path = path.substring(barIndex + 1);
    }
    return path;
  }

  exports.VCardHandler = {
    'handle': handle,
    'getFileName': getFileName
  };

})(window);
