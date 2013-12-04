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
      UIManager.noMemorycard.classList.add('hidden');
    } else {
      sdOption.setAttribute('disabled', 'disabled');
      if (!SdManager.alreadyImported) {
        UIManager.noMemorycard.classList.remove('hidden');
      }
    }
  },
  importContacts: function sm_importContacts() {
    // Delay for showing feedback to the user after importing
    var DELAY_FEEDBACK = 200;
    var importedContacts = 0;

    UIManager.navBar.setAttribute('aria-disabled', 'true');

    var cancelled = false;
    var importer = null;

    var progress = utils.overlay.show(
      _('memoryCardContacts-reading'), 'activityBar');
    utils.overlay.showMenu();
    utils.overlay.oncancel = function() {
      cancelled = true;
      if (importer) {
        importer.finish();
      } else {
        UIManager.navBar.removeAttribute('aria-disabled');
        utils.overlay.hide();
      }
    };

    var importButton = UIManager.sdImportButton;


    utils.sdcard.retrieveFiles([
      'text/vcard',
      'text/directory;profile=vCard',
      'text/directory'
    ], ['vcf', 'vcard'], function(err, fileArray) {
      if (err)
        return import_error(err);

      if (cancelled)
        return;

      if (fileArray.length)
        utils.sdcard.getTextFromFiles(fileArray, '', onFiles);
      else
        import_error('No contacts were found.');
    });

    function onFiles(err, text) {
      if (err)
        return import_error(err);

      if (cancelled)
        return;

      importer = new VCFReader(text);
      if (!text || !importer)
        return import_error('No contacts were found.');

      importer.onread = import_read;
      importer.onimported = imported_contact;
      importer.onerror = import_error;

      importer.process(function import_finish() {
        window.setTimeout(function onfinish_import() {
          window.importUtils.setTimestamp('sd');
          UIManager.navBar.removeAttribute('aria-disabled');
          utils.overlay.hide();
          if (!cancelled) {
            SdManager.alreadyImported = true;
            importButton.setAttribute('disabled', 'disabled');
            utils.status.show(
              _('memoryCardContacts-imported3', {n: importedContacts}));
          }

        }, DELAY_FEEDBACK);
      });
    }

    function import_read(n) {
      progress.setClass('progressBar');
      progress.setHeaderMsg(_('memoryCardContacts-importing'));
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
      ConfirmDialog.show(null, _('memoryCardContacts-error'), cancel, retry);
    }
  }
};
