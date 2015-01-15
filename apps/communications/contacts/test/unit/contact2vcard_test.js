'use strict';

/* globals MockContactAllFields, ContactToVcardBlob  */

require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/setImmediate.js');
require('/shared/js/contact2vcard.js');

suite('Contact2Vcard >', function() {
  var contact;

  suiteSetup(function() {
    contact = new MockContactAllFields(true);
    contact.photo = null;
  });

  // TODO: Add suite for verifying specific Contact serialization to vcard

  suite('MIME types >', function() {

    test('> Contact transformed to vcard. No options', function(done) {
      ContactToVcardBlob([contact], function blobReady(vcardBlob) {
        assert.isTrue(vcardBlob.size > 0);

        assert.equal(vcardBlob.type, 'text/vcard; charset=utf-8');
        done();
      });
    });

    test('> Contact transformed to vcard. Only MIME type', function(done) {
      var targetType = 'text/x-vcard';
      ContactToVcardBlob([contact], function blobReady(vcardBlob) {
        assert.isTrue(vcardBlob.size > 0);

        assert.equal(vcardBlob.type, targetType + '; charset=utf-8');
        done();
      }, { type: targetType });
    });

    test('> Contact transformed to vcard. MIME type & charset',
      function(done) {
        var targetType = 'text/x-vcard; charset=iso-8859-1';

        ContactToVcardBlob([contact], function blobReady(vcardBlob) {
          assert.isTrue(vcardBlob.size > 0);

          assert.equal(vcardBlob.type, targetType);
          done();
        }, { type: targetType });
    });

  });
});
