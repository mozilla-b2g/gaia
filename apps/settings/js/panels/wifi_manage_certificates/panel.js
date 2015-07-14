define(function(require) {
  'use strict';

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
        elements.certificateList = panel.querySelector('.wifi-certificateList');
        elements.deleteCertificateFailedDialog =
          panel.querySelector('.certificate-deletion-failed');
        elements.importCertificateBtn =
          panel.querySelector('.importCertificate');
        elements.deleteCertificateBtn =
          panel.querySelector('.deleteCertificate');
        elements.deleteCertificateBtn.onclick =
          this._deleteCertificate.bind(this);
      },
      onBeforeShow: function(panel) {
        this._scan();
      },
      _scan: function() {
        var list = elements.certificateList;
        this._cleanup();

        wifiManager.getImportedCerts().then((result) => {
          var certList = result;
          // save the imported server certificates
          var certificateList = certList.ServerCert;

          // display certificate list
          if (certificateList.length) {
            for (var i = 0; i < certificateList.length; i++) {
              list.appendChild(
                this._newCertificateItem(certificateList[i]));
            }

            // add event listener for update toggle delete/import cert. buttons
            var toggleBtnsWhenClicked = () => {
              var option = this._isItemSelected();
              this._toggleDeleteCertificateBtn(option);
              this._toggleImportCertificateBtn(!option);
            };

            var inputItems = list.querySelectorAll('input');
            for (var j = 0; j < inputItems.length; j++) {
              inputItems[j].onchange = toggleBtnsWhenClicked;
            }
          } else {
            // show "no certificates" message
            list.appendChild(
              WifiUtils.newExplanationItem('noImportedCertificates'));
          }
        }, () => {
          console.warn('getImportedCerts failed');
        });

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
        var countItemDeleted = 0;
        var checkedInputList =
          elements.certificateList.querySelectorAll(
            'input[type=checkbox]:checked');

        var scanWhenDeleteFinish = (totalLength) => {
          if (++countItemDeleted == totalLength) {
            // refresh certificate list
            countItemDeleted = 0;
            this._scan();
          }
        };

        var scanWhenDeleteError = (totalLength) => {
          if (++countItemDeleted == totalLength) {
            // refresh certificate list
            countItemDeleted = 0;
            this._scan();
          }
          // Pop out alert message for certificate deletion failed
          var dialog = elements.deleteCertificateFailedDialog;
          dialog.hidden = false;
          dialog.onsubmit = () => {
            dialog.hidden = true;
          };
        };

        for (var i = 0; i < checkedInputList.length; i++) {
          var nickname = checkedInputList[i].name;
          wifiManager.deleteCert(nickname).then(() => {
            scanWhenDeleteFinish(checkedInputList.length);
          }, () => {
            scanWhenDeleteError(checkedInputList.length);
          });
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
        var checkbox = document.createElement('gaia-checkbox');
        checkbox.name = caName;

        var label = document.createElement('label');
        label.textContent = caName;

        checkbox.appendChild(label);

        var li = document.createElement('li');
        li.appendChild(checkbox);

        return li;
      }
    });
  };
});
