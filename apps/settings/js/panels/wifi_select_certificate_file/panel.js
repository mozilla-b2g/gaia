define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SettingsService = require('modules/settings_service');
  var DialogService = require('modules/dialog_service');
  var EnumerateAll = require('shared/device_storage/enumerate_all');
  var WifiHelper = require('shared/wifi_helper');
  var wifiManager = WifiHelper.getWifiManager();

  return function ctor_selectCertificateWifi() {
    var elements = {};

    return SettingsPanel({
      onInit: function(panel) {
        elements = {};
        elements.panel = panel;
        elements.certificateFilesList =
          panel.querySelector('.wifi-certificate-files-List');
      },
      onBeforeShow: function(panel) {
        this._cleanup();
        this._createScanList(elements.certificateFilesList);
      },
      _cleanup: function() {
        // clear the certificate files list
        while (elements.certificateFilesList.hasChildNodes()) {
          elements.certificateFilesList.removeChild(
            elements.certificateFilesList.lastChild
          );
        }
      },
      _createScanList: function(list) {
        var storages = navigator.getDeviceStorages('sdcard');
        var cursor = EnumerateAll(storages, '');

        cursor.onsuccess = function() {
          var file = cursor.result;
          if (file) {
            var extension = this._parseExtension(file.name);
            if (this._isCertificateFile(extension)) {
              var li = this._createLinkAnchor(file);
              list.appendChild(li);
            }
            cursor.continue();
          }
        }.bind(this);

        cursor.onerror = function() {
          console.warn('failed to get file:' + cursor.error.name);
        };
      },
      _setCertificateItemsEnabled: function(enabled) {
        var items = elements.certificateFilesList.querySelectorAll('li');
        var update = enabled ? function(item) {
          item.classList.remove('disabled');
        } : function(item) {
          item.classList.add('disabled');
        };
        for (var i = 0; i < items.length; i++) {
          update(items[i]);
        }
      },
      _createLinkAnchor: function(file) {
        // create anchor
        var anchor = document.createElement('a');
        var certificateName = this._parseFilename(file.name);
        anchor.textContent = certificateName;

        var li = document.createElement('li');
        li.appendChild(anchor);

        anchor.onclick = () => {
          DialogService.show('wifi-enterCertificateNickname', {
            certificateName: certificateName
          }).then((result) => {
            var type = result.type;
            var value = result.value;

            if (type === 'submit') {
              var certRequest =
                wifiManager.importCert(file, '', value.nickname);

              // Gray out all item of certificate files
              // since we are importing other file.
              this._setCertificateItemsEnabled(false);
              certRequest.onsuccess = () => {
                // direct dialog to "wifi-manageCertificates"
                SettingsService.navigate('wifi-manageCertificates');
              };

              certRequest.onerror = () => {
                DialogService.alert('certificate-import-failed-description', {
                  title: 'certificate-import-failed'
                }).then(() => {
                  // Re-enable all items of certificate files
                  // since import file process is completed.
                  this._setCertificateItemsEnabled(true);
                });
              };
            }
          });
        };
        return li;
      },
      _parseFilename: function(path) {
        return path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
      },
      _parseExtension: function(filename) {
        var array = filename.split('.');
        return array.length > 1 ? array.pop() : '';
      },
      _isCertificateFile: function(extension) {
        var cerExtension = ['cer', 'crt', 'pem', 'der'];
        return cerExtension.indexOf(extension) > -1;
      },
    });
  };
});
