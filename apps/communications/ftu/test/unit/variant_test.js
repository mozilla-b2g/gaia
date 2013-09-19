'use strict';

requireApp('communications/ftu/js/variant.js');

var resourcesDir = '/ftu/test/unit';
var customizationFilePath = '/resources/customization.json';
var reference_MNC_MCC = '214-007';
var sample_reference_params, customizationFullPath;

suite('variant >', function() {

  suiteSetup(function(done) {
    customizationFullPath = resourcesDir + customizationFilePath;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', customizationFullPath, true);
    xhr.overrideMimeType('application/json');
    xhr.responseType = 'json';
    xhr.onload = function() {
      if (xhr.status === 200) {
        sample_reference_params = xhr.response[reference_MNC_MCC];
        done();
      } else {
        console.error('Failed to fetch file: ' +
          customizationFullPath, xhr.statusText);
      }
    };
    try {
      xhr.send();
    } catch (e) {
      console.error('Failed to fetch file: ' +
        customizationFullPath);
    }
  });

  suite(' customization.json >', function() {
    setup(function() {
      VariantManager.mcc_mnc = reference_MNC_MCC;
    });

    teardown(function() {
      VariantManager.mcc_mnc = null;
    });

    test(' load customization.json file & Check structure', function(done) {
      VariantManager.readJSONFile(customizationFullPath,
        function(customizations) {
        var customization = customizations[reference_MNC_MCC];
        // Check that the customization exists
        assert.isFalse(!customization);
        // Check that all params are reference ones
        for (var param in customization) {
          assert.isTrue(sample_reference_params.hasOwnProperty(param));
        }
        done();
      });
    });

    test(' load customization.json file error.', function(done) {
      var wrongFullPath = resourcesDir + 'wrong_path.json';
      var onsuccess = function() {};
      VariantManager.readJSONFile(wrongFullPath, onsuccess,
        function onerror() {
        done();
      });
    });

    test(' check values in the structure.', function(done) {
      VariantManager.readJSONFile(customizationFullPath,
        function(customizations) {
        var customization = customizations[reference_MNC_MCC];
        // Check that all params are reference ones
        for (var param in customization) {
          assert.equal(sample_reference_params[param], customization[param]);
        }
        done();
      });
    });

    test(' check customization events', function() {
      window.addEventListener('customization',
        function customizationListener(event) {
        window.removeEventListener('customization', customizationListener);
        assert.equal(event.detail.setting,
          Object.keys(sample_reference_params)[0]);
        assert.equal(event.detail.valye,
          sample_reference_params[event.detail.setting]);
        done();
      });
      VariantManager.readJSONFile(customizationFullPath,
        function(customizations) {
        var customization = customizations[reference_MNC_MCC];
        // Dispatch events
        VariantManager.dispatchCustomizationEvents(customization);
      });
    });
  });
});
