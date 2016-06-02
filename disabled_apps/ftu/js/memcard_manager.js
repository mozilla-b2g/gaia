/* global ConfirmDialog,
          UIManager,
          utils,
          VCFReader */

/* exported SdManager */

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
    var importedContacts = 0;

    UIManager.navBar.setAttribute('aria-disabled', 'true');

    var cancelled = false;
    var importer = null;
    var importButton;

    var progress = utils.overlay.show(
      'memoryCardContacts-importing',
      'activityBar',
      'infiniteProgress'
    );
    utils.overlay.showMenu();

    return new Promise((resolve, reject) => {
      utils.overlay.oncancel = () => {
        cancelled = true;
        if (importer) {
          importer.finish();
        } else {
          UIManager.navBar.removeAttribute('aria-disabled');
          utils.overlay.hide();
        }
        resolve();
      };

      importButton = UIManager.sdImportButton;

      utils.sdcard.retrieveFiles([
        'text/vcard',
        'text/directory;profile=vCard',
        'text/directory'
      ], ['vcf', 'vcard'], (error, fileArray) => {
        if (!error && !fileArray.length) {
          error = 'No contacts were found';
        }

        if (error) {
          reject(error);
          return import_error(error);
        }

        if (cancelled) {
          resolve();
          return;
        }

        var promises = [];
        fileArray.forEach(file => {
          promises.push(utils.sdcard.getTextFromFile(file, onContacts));
        });

        Promise.all(promises).then(() => {
          utils.misc.setTimestamp('sd');
          UIManager.navBar.removeAttribute('aria-disabled');
          utils.overlay.hide();
          if (cancelled) {
            resolve();
            return;
          }
          SdManager.alreadyImported = true;
          importButton.setAttribute('disabled', 'disabled');
          utils.status.show({
            id: 'memoryCardContacts-imported3',
            args: { n: importedContacts }
          });
          resolve();
        }).catch(reject);
      });
    });

    function onContacts(text) {
      if (cancelled) {
        return Promise.reject();
      }
      return new Promise((resolve, reject) => {
        importer = new VCFReader(text);

        if (!text || !importer) {
          var error = 'No contacts were found';
          import_error(error);
          reject(error);
          return;
        }

        importer.onimported = imported_contact;
        importer.onerror = error => {
          import_error(error);
          reject(error);
        };

        importer.process(() => {
          if (cancelled) {
            reject('Cancelled');
            utils.overlay.hide();
            return;
          }
          resolve();
        });
      });
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
        title: 'cancel',
        callback: function() {
          ConfirmDialog.hide();
        }
      };

      var retry = {
        title: 'retry',
        isRecommend: true,
        callback: function() {
          ConfirmDialog.hide();
          // And now the action is reproduced one more time
          importButton.click();
        }
      };
      ConfirmDialog.show(null, 'memoryCardContacts-error', cancel, retry);
    }
  }
};
