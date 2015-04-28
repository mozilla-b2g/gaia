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
          this._importCertificate(file);
        };
        return li;
      },
      _importCertificate: function(file) {
        var certificateName = this._parseFilename(file.name);
        var isPasswordRequired =
          this._isPasswordRequired(this._parseExtension(file.name));
        var password, nickname;

        (() => {
          this._setCertificateItemsEnabled(false);
          if (isPasswordRequired) {
            return this._requestPassword();
          } else {
            return Promise.resolve(null);
          }
        })().then((result) => {
          if (isPasswordRequired && !result) {
            return Promise.reject('invalid-password');
          } else {
            password = result;
            return this._requestNickName(certificateName);
          }
        }).then((result) => {
          nickname = result;
          return new Promise((resolve, reject) => {
            var req = wifiManager.importCert(file, password, nickname);
            req.onsuccess = resolve;
            req.reject = onerror;
          });
        }).then(() => {
          SettingsService.navigate('wifi-manageCertificates');
        }).catch((error) => {
          if (error === 'cancel') {
            return;
          } else if (error === 'invalid-password') {
            // should use specific warning message
            return DialogService.alert(
              'certificate-import-failed-description', {
                title: 'certificate-import-failed'
            });
          } else {
            return DialogService.alert(
              'certificate-import-failed-description', {
                title: 'certificate-import-failed'
            });
          }
        }).then(() => {
          this._setCertificateItemsEnabled(true);
        });
      },
      _requestNickName: function(certificateName) {
        return DialogService.show('wifi-enterCertificateNickname', {
          certificateName: certificateName
        }).then((result) => {
          var type = result.type;
          var value = result.value;
          if (type === 'submit') {
            return value.nickname;
          } else {
            return Promise.reject('cancel');
          }
        });
      },
      _requestPassword: function() {
        return DialogService.prompt(null, {
          title: 'enterCertificatePassowrd',
          defaultValue: '',
          submitButton: 'ok',
          cancelButton: 'cancel'
        }).then((result) => {
          var type = result.type;
          var value = result.value;
          if (type === 'submit') {
            return value;
          } else {
            return Promise.reject('cancel');
          }
        });
      },
      _parseFilename: function(path) {
        return path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
      },
      _parseExtension: function(filename) {
        var array = filename.split('.');
        return array.length > 1 ? array.pop() : '';
      },
      _isCertificateFile: function(extension) {
        var cerExtension = ['cer', 'crt', 'pem', 'der', 'pfx', 'p12'];
        return cerExtension.indexOf(extension) > -1;
      },
      _isPasswordRequired: function(extension) {
        var cerExtension = ['pfx', 'p12'];
        return cerExtension.indexOf(extension) > -1;
      },
    });
  };
});
