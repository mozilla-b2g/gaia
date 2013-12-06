/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle Wi-Fi select certificate file page
navigator.mozL10n.ready(function wifiSelectCertificateFile() {
  var _ = navigator.mozL10n.get;

  var gWifiManager = WifiHelper.getWifiManager();

  // select certificate files to import
  var gSelectCertificateFiles = (function certificateFiles(list) {
    var certificateFiles = [];

    // parse extension
    function _parseExtension(filename) {
      var array = filename.split('.');
      return array.length > 1 ? array.pop() : '';
    }

    // parse filename
    function _parseFilename(path) {
      return path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
    }

    // clear the certificate files list
    function clear() {
      while (list.hasChildNodes()) {
        list.removeChild(list.lastChild);
      }
    }

    // scan and list certificate files from SDCard
    function scan() {
      clear();
      var storages = navigator.getDeviceStorages('sdcard');
      var cursor = enumerateAll(storages, '');

      cursor.onsuccess = function() {
        var file = cursor.result;
        if (file) {
          var extension = _parseExtension(file.name);
          var cerExtension = ['cer', 'crt', 'pem', 'der'];
          if (cerExtension.indexOf(extension) > -1) {
            certificateFiles.push(file);

            var a = document.createElement('a');
            a.textContent = _parseFilename(file.name);
            var inputNickname =
              document.getElementById('certificate-file-nickname');
            a.onclick = function settingsNicknameForImportCertificateFile() {
              // given a default nickname from filename
              inputNickname.value = a.textContent;
              openDialog('wifi-enterCertificateNickname', function submit() {
                var certRequest = gWifiManager.importCert(file,
                                                          '',
                                                          inputNickname.value);
                // Gray out all item of certificate files
                // since we are importing other file.
                var items = list.querySelectorAll('li');
                for (var i = 0; i < items.length; i++) {
                  items[i].classList.add('disabled');
                }

                certRequest.onsuccess = function() {
                  // direct dialog to "wifi-manageCertificates"
                  Settings.currentPanel = '#wifi-manageCertificates';
                  // scan certificate list again
                  // while the panel is ready #wifi-manageCertificates
                  // dispatch event for gCertificateList.scan();
                  dispatchEvent(new CustomEvent('certificate-imported'));
                };
                certRequest.onerror = function() {
                  // Pop out alert message for certificate import failed
                  var dialog =
                    document.getElementById('certificate-import-failed');
                  dialog.hidden = false;
                  dialog.onsubmit = function confirm() {
                    dialog.hidden = true;
                  };
                  // Re-enable all items of certificate files
                  // since import file process is completed.
                  var items = list.querySelectorAll('li');
                  for (var i = 0; i < items.length; i++) {
                    if (items[i].classList.contains('disabled'))
                      items[i].classList.remove('disabled');
                  }
                };
              });
            };
            var li = document.createElement('li');
            li.appendChild(a);
            list.appendChild(li);
          }

          cursor.continue();
        }
      };
      cursor.onerror = function() {
        var msg = 'failed to get file:' +
                  cursor.error.name;
        console.warn(msg);
      };
    }

    // API
    return {
      scan: scan
    };
  }) (document.getElementById('wifi-certificate-files-List'));

  // when open dialog to select certificate file page,
  // update the certificate files via device storage
  window.addEventListener('scan-certificate-file', function() {
    gSelectCertificateFiles.scan();
  });
});

