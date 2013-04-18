'use strict';

var SdManager = {
  available: function() {
    return utils.sdcard.checkStorageCard();
  },
  checkSDButton: function sm_checkSDButton() {
    var sdOption = UIManager.sdImportButton;
    // If there is an unlocked SD we activate import from SD
    if (!SdManager.alreadyImported && SdManager.available()) {
      sdOption.removeAttribute('disabled');
      UIManager.noSd.classList.add('hidden');
    } else {
      sdOption.setAttribute('disabled', 'disabled');
      if (!SdManager.alreadyImported) {
        UIManager.noSd.classList.remove('hidden');
      }
    }
  },
  importContacts: function sm_importContacts() {
    // Delay for showing feedback to the user after importing
    var DELAY_FEEDBACK = 300;
    var importedContacts = 0;

    UIManager.navBar.setAttribute('aria-disabled', 'true');
    var progress = utils.overlay.show(_('sdContacts-reading'), 'activityBar');

    var importButton = UIManager.sdImportButton;
    importButton.setAttribute('disabled', 'disabled');

    utils.sdcard.retrieveFiles([
      'text/vcard',
      'text/x-vcard',
      'text/directory;profile=vCard',
      'text/directory'
    ], ['vcf', 'vcard'], function(err, fileArray) {
      if (err)
        return import_error(err);

      if (fileArray.length)
        utils.sdcard.getTextFromFiles(fileArray, '', onFiles);
    });

    function onFiles(err, text) {
      if (err)
        return import_error(err);

      var importer = new VCFReader(text);
      if (!text || !importer)
        return import_error('No contacts were found.');

      importer.onread = import_read;
      importer.onimported = imported_contact;
      importer.onerror = import_error;

      importer.process(function import_finish() {
        window.setTimeout(function onfinish_import() {
          SdManager.alreadyImported = true;

          UIManager.navBar.removeAttribute('aria-disabled');
          utils.overlay.hide();
          utils.status.show(_('sdContacts-imported3', {n: importedContacts}));

        }, DELAY_FEEDBACK);
      });
    }

    function import_read(n) {
      progress.setClass('progressBar');
      progress.setHeaderMsg(_('sdContacts-importing'));
      progress.setTotal(n);
    }

    function imported_contact() {
      importedContacts++;
      progress.update();
    }

    function import_error(e) {
      UIManager.navBar.removeAttribute('aria-disabled');
      utils.overlay.hide();
      // Just in case the user decides to do so later
      importButton.removeAttribute('disabled');

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
          importButton.click();
        }
      };
    }
  }
};
