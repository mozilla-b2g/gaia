define(function(require) {
  'use strict';

  var DialogService = require('modules/dialog_service');
  var SettingsPanel = require('modules/settings_panel');
  var WifiUtils = require('modules/wifi_utils');
  var WifiHelper = require('shared/wifi_helper');
  var CertificateTemplateFactory =
    require('panels/wifi_manage_certificates/certificate_template_factory');
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
              var certificateName = certificateList[i];
              var certificateItem = CertificateTemplateFactory(certificateName,
                this._onCertificateItemClick.bind(this, certificateName));
              list.appendChild(certificateItem);
            }
          } else {
            // show "no certificates" message
            list.appendChild(
              WifiUtils.newExplanationItem('noImportedCertificates'));
          }
        }, () => {
          console.warn('getImportedCerts failed');
        });
      },
      _cleanup: function() {
        while (elements.certificateList.hasChildNodes()) {
          elements.certificateList.removeChild(
            elements.certificateList.lastChild
          );
        }
      },
      _deleteCertificate: function(name) {
        wifiManager.deleteCert(name).then(() => {
          this._scan();
        }, () => {
          DialogService.alert({
            id: 'certificate-deletion-failed-description',
          }, {
            title: 'certificate-deletion-failed'
          });
        });
      },
      _onCertificateItemClick: function(name) {
        DialogService.confirm('certificate-confirm-to-delete').then(
          (result) => {
            var type = result.type;
            if (type === 'submit') {
              this._deleteCertificate(name);
            }
        });
      }
    });
  };
});
