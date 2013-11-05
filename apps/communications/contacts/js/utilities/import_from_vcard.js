'use strict';

var utils = window.utils || {};

/**
 * Loads the file passed on the activity, reads the text from it, and
 * import the info
 * Passes the id of last imported contact in the callback
 */
utils.importFromVcard = function(file, callback) {
  Contacts.utility('Overlay', function _loaded() {
    var importedContacts = 0;
    var cancelled = false;
    var importer = null;
    var text = null;
    var progress = utils.overlay.show(
                   _('memoryCardContacts-reading'),
                   'activityBar'
                 );

    utils.overlay.showMenu();
    utils.overlay.oncancel = function oncancel() {
      cancelled = true;
      if (importer) {
        importer.finish();
      } else {
        utils.overlay.hide();
      }
    };

    var reader = new FileReader();
    reader.onloadend = function() {
      text = reader.result;
      if (text) {
        processTextFromFile(text);
      }
    };

    try {
      reader.readAsText(file);
    }
    catch (ex) {
      console.error('Error reading the file ' + ex.message);
      callback();
    }

    function processTextFromFile(textFromFile) {
      if (cancelled)
        return;
      importer = new VCFReader(textFromFile);
      if (!textFromFile || !importer)
        return;// No contacts were found.
      importer.onread = import_read;
      importer.onimported = imported_contact;
      importer.onerror = import_error;

      importer.process(function import_finish(result) {
        utils.overlay.hide();
        if (!cancelled) {
          utils.status.show(
            _('memoryCardContacts-imported3',
            {n: importedContacts})
          );
        }
        callback(result[0].id);
      });
    };

    function import_read(n) {
      progress.setClass('progressBar');
      progress.setHeaderMsg(_('memoryCardContacts-importing'));
      progress.setTotal(n);
    };

    function imported_contact() {
      importedContacts++;
      if (!cancelled) {
        progress.update();
      }
    };

    function import_error(e) {
      console.error('Error importing from vcard: ' + e.message);
      // Showing error message allowing user to retry
      var cancel = {
        title: _('cancel'),
        callback: function() {
          ConfirmDialog.hide();
        }
      };

      var retry = {
        title: _('retry'),
        isRecommend: true,
        callback: function() {
          ConfirmDialog.hide();
          // And now the action is reproduced one more time
          processTextFromFile(text);
        }
      };
      Contacts.confirmDialog(null, _('memoryCardContacts-error'),
                             cancel, retry);
      utils.overlay.hide();
    };
  });
};
