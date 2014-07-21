define(function(require) {
  'use strict';

  var SettingsUtils = require('modules/settings_utils');
  var SettingsPanel = require('modules/settings_panel');
  var WifiUtils = require('modules/wifi_utils');
  var WifiHelper = require('shared/wifi_helper');
  var wifiManager = WifiHelper.getWifiManager();

  return function ctor_manageCertificatedWifi() {
    var elements = {};

    return SettingsPanel({
      onInit: function(panel) {
        elements = {};
        elements.panel = panel;
        elements.certificateList = panel.querySelector('#wifi-certificateList');
        elements.deleteCertificateFailedDialog =
          panel.querySelector('#certificate-deletion-failed');
        elements.importCertificateBtn =
          panel.querySelector('#importCertificate');
        elements.deleteCertificateBtn =
          panel.querySelector('#deleteCertificate');

        elements.importCertificateBtn.onclick = function() {
          SettingsUtils.openDialog('wifi-selectCertificateFile');
        };

        elements.deleteCertificateBtn.onclick =
          this._deleteCertificate.bind(this);
      },
      onBeforeShow: function(panel) {
        this._scan();
      },
      _scan: function() {
        var self = this;
        var list = elements.certificateList;
        this._cleanup();

        var certRequest = wifiManager.getImportedCerts();
        certRequest.onsuccess = function() {
          var certList = certRequest.result;
          // save the imported server certificates
          var certificateList = certList.ServerCert;

          // display certificate list
          if (certificateList.length) {
            for (var i = 0; i < certificateList.length; i++) {
              list.appendChild(
                self._newCertificateItem(certificateList[i]));
            }

            // add event listener for update toggle delete/import cert. buttons
            var toggleBtnsWhenClicked = function() {
              var option = self._isItemSelected();
              self._toggleDeleteCertificateBtn(option);
              self._toggleImportCertificateBtn(!option);
            };

            var inputItems = list.querySelectorAll('input');
            for (var j = 0; j < inputItems.length; j++) {
              inputItems[j].onchange = toggleBtnsWhenClicked;
            }
          } else {
            // display "no certificate" message
            // while no any imported certificate
            list.appendChild(
              WifiUtils.newExplanationItem('noCertificate'));
          }
        };

        certRequest.onerror = function() {
          console.warn('getImportedCerts failed');
        };

        this._toggleDeleteCertificateBtn(false);
        this._toggleImportCertificateBtn(true);
      },
      _cleanup: function() {
        while (elements.certificateList.hasChildNodes()) {
          elements.certificateList.removeChild(
            elements.certificateList.lastChild
          );
        }
      },
      _deleteCertificate: function() {
        var self = this;
        var countItemDeleted = 0;
        var checkedInputList =
          elements.certificateList.querySelectorAll(
            'input[type=checkbox]:checked');

        var scanWhenDeleteFinish = function(totalLength) {
          return function() {
            if (++countItemDeleted == totalLength) {
              // refresh certificate list
              countItemDeleted = 0;
              self._scan();
            }
          };
        };

        var scanWhenDeleteError = function(totalLength) {
          return function() {
            if (++countItemDeleted == totalLength) {
              // refresh certificate list
              countItemDeleted = 0;
              self._scan();
            }
            // Pop out alert message for certificate deletion failed
            var dialog = elements.deleteCertificateFailedDialog;
            dialog.hidden = false;
            dialog.onsubmit = function confirm() {
              dialog.hidden = true;
            };
          };
        };

        for (var i = 0; i < checkedInputList.length; i++) {
          var nickname = checkedInputList[i].name;
          var certRequest = wifiManager.deleteCert(nickname);
          certRequest.onsuccess = scanWhenDeleteFinish(checkedInputList.length);
          certRequest.onerror = scanWhenDeleteError(checkedInputList.length);
        }
      },
      _isItemSelected: function() {
        return elements.certificateList.querySelector(
          'input[type=checkbox]:checked') != null;
      },
      _toggleImportCertificateBtn: function(enabled) {
        elements.importCertificateBtn.disabled = !enabled;
      },
      _toggleDeleteCertificateBtn: function(enabled) {
        elements.deleteCertificateBtn.disabled = !enabled;
      },
      _newCertificateItem: function(caName) {
        var label = document.createElement('label');
        label.className = 'pack-checkbox';

        var input = document.createElement('input');
        input.type = 'checkbox';
        input.name = caName;
        input.checked = false;

        var span = document.createElement('span');
        span.textContent = caName;

        label.appendChild(input);
        label.appendChild(span);

        var li = document.createElement('li');
        li.appendChild(label);

        return li;
      }
    });
  };
});
