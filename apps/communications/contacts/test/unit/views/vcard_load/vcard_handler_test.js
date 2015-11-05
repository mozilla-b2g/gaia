/* global VCardHandler, MockVCardReader */

'use strict';

requireApp('communications/contacts/views/vcard_load/js/vcard_handler.js');
requireApp('communications/contacts/test/unit/mock_vcard_reader.js');

suite('VCardHandler', function() {
  const VCARD_PATH = '/apps/communications/contacts/test/unit/vcards/';
  const VCARD_FILE =
    '/apps/communications/contacts/test/unit/vcards/vcard_21.vcf';
  const VCARD_FILE_MULTIPLE =
    '/apps/communications/contacts/test/unit/vcards/vcard_21_multiple.vcf';
  var realVCardReader;
  var fakeActivity = {
    source: {
      data: {
        allowSave: true,
        blob: null,
        filename: VCARD_FILE,
        type:'text/x-vcard'
      }
    }
  };

  setup(function() {
    loadBodyHTML('/contacts/views/vcard_load/vcard_load.html');
    realVCardReader = window.VCardReader;
    window.VCardReader = MockVCardReader;
  });

  teardown(function() {
    window.VCardReader = realVCardReader;
    realVCardReader = null;
  });

  suite('handle', function() {
    function initializeVCardReader(filename) {
      return new Promise(function(resolve, reject) {
        var req = new XMLHttpRequest();
        var vCardUrl = VCARD_PATH + filename;
        req.open('get', vCardUrl, true);
        req.send();
        req.onload = function() {
          resolve(this.responseText);
        };
      });
    }

    test(' > vCard is parsed correctly', function(done) {
      initializeVCardReader('vcard_21_multiple.vcf').then(function(vCardText) {
        var blob = new Blob([vCardText], {type: 'text/x-vCard'});
        fakeActivity.source.data.blob = blob;
        VCardHandler.handle(fakeActivity).then(function(contacts) {
          assert.equal(contacts.length, 6);
          done();
        });
      });
    });
  });

  suite('getFileName', function() {
    test(' > vCard filename', function() {
      var name = VCardHandler.getFileName(VCARD_FILE_MULTIPLE);

      assert.equal(name, 'vcard_21_multiple.vcf');
    });
  });
});
