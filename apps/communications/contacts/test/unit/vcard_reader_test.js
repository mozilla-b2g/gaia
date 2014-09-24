/* global VCardReader, b64Photo, MockRest, MocksHelper */

'use strict';

require('/shared/js/mime_mapper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/contacts/import/utilities/vcard_reader.js');

requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/contacts/test/unit/import/mock_rest.js');
requireApp('communications/contacts/test/unit/base64_photo.js');

function toDataUri(photo, cb) {
  var reader = new window.FileReader();
  reader.readAsDataURL(photo);
  reader.onloadend = cb.bind(null, reader);
}

function initializeVCardReader(filename, cb) {
  var req = new XMLHttpRequest();
  var vCardUrl = '/apps/communications/contacts/test/unit/vcards/' + filename;
  req.open('get', vCardUrl, true);
  req.send();
  req.onload = function() {
    cb(new VCardReader(this.responseText));
  };
}

var mocksHelperForVCardReader = new MocksHelper([
  'LazyLoader'
]).init();

suite('VCardReader', function() {

  mocksHelperForVCardReader.attachTestHelpers();

  var realRest;
  var realUtils;

  suiteSetup(function() {
    realUtils = window.utils;
    window.utils = {
      'misc': {
        'toMozContact': function(c) {
          return c;
        }
      }
    };

    realRest = window.Rest;
    window.Rest = MockRest;  
    window.Rest.configure({
      'http://www.example.com/dir_photos/my_photo.gif':
        VCardReader.b64toBlob(b64Photo, 'image/bmp'),
      type: 'success'
    });
  });

  suiteTeardown(function() {
    window.Rest = realRest;
    window.utils = realUtils;
  });

  suite('reading a VCard 2.1 file with one contact', function() {

    var reader;

    setup(function(done) {
      initializeVCardReader('vcard_21.vcf', function(r) {
        reader = r;
        done();
      });
    });

    test('should be calling onsuccess after reading the first', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        cursor.continue();
        done();
      };
    });

    test('should be calling onfinished when done', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        cursor.continue();
      };
      cursor.onfinished = function() {
        done();
      };
    });

    test('contact fields are propertly parsed ', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;
        assert.strictEqual('Gump Fórrest', contact.name[0]);
        assert.strictEqual('Fórrest', contact.givenName[0]);
        assert.strictEqual('Bóbba Gump Shrimp Co.', contact.org[0]);
        assert.strictEqual('Shrómp Man', contact.jobTitle[0]);

        assert.strictEqual('work', contact.tel[0].type[0]);
        assert.strictEqual('(111) 555-1212', contact.tel[0].value);
        assert.strictEqual('home', contact.tel[1].type[0]);
        assert.strictEqual('(404) 555-1212', contact.tel[1].value);
        assert.strictEqual('WORK', contact.adr[0].type[0]);

        assert.strictEqual('100 Wáters Edge', contact.adr[0].streetAddress);
        assert.strictEqual('Baytown', contact.adr[0].locality);
        assert.strictEqual('LA', contact.adr[0].region);
        assert.strictEqual('30314', contact.adr[0].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[0].countryName);

        assert.strictEqual('HOME', contact.adr[1].type[0]);
        assert.strictEqual('42 Plantation St.', contact.adr[1].streetAddress);
        assert.strictEqual('Baytown', contact.adr[1].locality);
        assert.strictEqual('LA', contact.adr[1].region);
        assert.strictEqual('30314', contact.adr[1].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[1].countryName);

        assert.strictEqual('forrestgump@example.com', contact.email[0].value);
        assert.strictEqual('internet', contact.email[0].type[0]);

        assert.equal(new Date(Date.UTC(1975, 4, 20)).toISOString(),
                     contact.bday.toISOString());
        assert.equal(new Date(Date.UTC(2004, 0, 20)).toISOString(),
                      contact.anniversary.toISOString());

        done();
      };
    });
  });

  suite('reading a VCard 2.1 file with 6 contacts', function() {

    var reader;

    setup(function(done) {
      initializeVCardReader('vcard_21_multiple.vcf', function(r) {
        reader = r;
        done();
      });
    });

    test('cursor onsuccess is called 6 times', function(done) {
      var contactCount = 0;
      var cursor = reader.getAll();
      cursor.onsuccess = function() {
        contactCount++;
        cursor.continue();
      };
      cursor.onfinished = function() {
        assert.strictEqual(contactCount, 6);
        done();
      };
    });

  });

  suite('reading a VCard 2.1 file with photo', function() {

    var contacts;

    setup(function(done) {
      contacts = [];
      initializeVCardReader('vcard_21_photo.vcf', function(reader) {
        var cursor = reader.getAll();
        cursor.onsuccess = function(evt) {
          contacts[evt.target.count] = evt.target.result;
          cursor.continue();
        };
        cursor.onfinished = function() {
          done();
        };
      });
    });

    test('contact with embedded photo', function(done) {
      toDataUri(contacts[0].photo[0], function(r) {
        assert.strictEqual(b64Photo,
         VCardReader.parseDataUri(r.result).value);
        assert.strictEqual('image/bmp', contacts[0].photo[0].type);
        done();
      });
    });

    test('contact with URL photo', function(done) {
      toDataUri(contacts[1].photo[0], function(r) {
        assert.strictEqual(b64Photo,
         VCardReader.parseDataUri(r.result).value);
        assert.strictEqual('image/bmp', contacts[1].photo[0].type);
        done();
      });
    });

    test('contact with bad b64 data', function() {
      assert.ok(typeof contacts[2].photo, 'undefined');
    });
  });
  
  suite('reading a VCard 2.1 file with quoted printable', function() {

    var reader;

    setup(function(done) {
      initializeVCardReader('vcard_2_qp.vcf', function(r) {
        reader = r;
        done();
      });
    });

    test('contact data should be properly parsed', function(done) {
      var contactNum = 0;
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;
        contactNum++;
        if (contactNum === 1) {
          assert.strictEqual('Tanja Tanzbein', contact.name[0]);
          assert.strictEqual('Tanja', contact.givenName[0]);
          assert.strictEqual('work', contact.tel[0].type[0]);
          assert.strictEqual('+3434269362248', contact.tel[0].value);
        } else if (contactNum === 2) {
          assert.strictEqual('Thomas Rücker', contact.name[0]);
          assert.strictEqual('Thomas', contact.givenName[0]);
          assert.strictEqual('mobile', contact.tel[0].type[0]);
          assert.strictEqual('+72682252873', contact.tel[0].value);
        }
        cursor.continue();
      };
      cursor.onfinished = function() {
        done();
      };
    });
  });

  suite('reading a Vcard 2.1 multiline quoted', function(done) {
    var reader;
    setup(function(done) {
      initializeVCardReader('vcard_2_qp_utf8.vcf', function(r) {
        reader = r;
        done();
      });
    });

    test('contact data should be properly parsed', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;
        assert.strictEqual(
          'Freunde und Förderer TU Dresden', contact.org[0]);
        done();         
      };
    });

  });

  suite('reading a VCard 3.0 file', function() {
    var reader;
    setup(function(done) {
      initializeVCardReader('vcard_3.vcf', function(r) {
        reader = r;
        done();
      });
    });

    test('contact data should be properly parsed', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;
        assert.strictEqual('Forrest Gump', contact.name[0]);
        assert.strictEqual('Forrest', contact.givenName[0]);
        assert.strictEqual('Bubba Gump Shrimp Co.', contact.org[0]);
        assert.strictEqual('Shrimp Man', contact.jobTitle[0]);

        assert.strictEqual('work', contact.tel[0].type[0]);
        assert.strictEqual('(111) 555-1212', contact.tel[0].value);
        assert.strictEqual('home', contact.tel[1].type[0]);
        assert.strictEqual('(404) 555-1212', contact.tel[1].value);

        assert.strictEqual('WORK', contact.adr[0].type[0]);
        assert.strictEqual('100 Waters Edge', contact.adr[0].streetAddress);
        assert.strictEqual('Baytown', contact.adr[0].locality);
        assert.strictEqual('LA', contact.adr[0].region);
        assert.strictEqual('30314', contact.adr[0].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[0].countryName);

        assert.strictEqual('HOME', contact.adr[1].type[0]);
        assert.strictEqual('42 Plantation St.', contact.adr[1].streetAddress);
        assert.strictEqual('Baytown', contact.adr[1].locality);
        assert.strictEqual('LA', contact.adr[1].region);
        assert.strictEqual('30314', contact.adr[1].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[1].countryName);

        assert.strictEqual('forrestgump@example.com', contact.email[0].value);
        assert.strictEqual('internet', contact.email[0].type[0]);

        toDataUri(contact.photo[0], function(r) {
          assert.strictEqual(b64Photo,
           VCardReader.parseDataUri(r.result).value);
          assert.strictEqual('image/bmp', contact.photo[0].type);
          done();
        });
      };
    });

  });

  suite('reading a VCard 3.0 file with utf8 characters', function(done) {
    var reader;
    setup(function(done) {
      initializeVCardReader('vcard_3_utf8.vcf', function(r) {
        reader = r;
        done();
      });
    });

    test('contact data should be properly parsed', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;
        assert.strictEqual('Foo Bar', contact.name[0]);
        assert.strictEqual('Foo', contact.givenName[0]);
        assert.ok(contact.tel[0].type.indexOf('mobile') > -1);
        assert.ok(contact.tel[1].type.indexOf('work') > -1);
        assert.strictEqual(true, contact.tel[0].pref);
        assert.strictEqual('(123) 456-7890', contact.tel[0].value);
        assert.strictEqual('(123) 666-7890', contact.tel[1].value);
        assert.ok(!contact.org[0]);
        assert.strictEqual('home', contact.email[0].type[0]);
        assert.strictEqual('example@example.org', contact.email[0].value);
        done();
      };
    });
  });

  suite('reading a VCard 4.0 file', function() {
    var reader;
    setup(function(done) {
      initializeVCardReader('vcard_4.vcf', function(r) {
        reader = r;
        done();
      });
    });

    test('contact data should be properly parsed', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;
        assert.strictEqual('Forrest Gump', contact.name[0]);
        assert.strictEqual('Forrest', contact.givenName[0]);
        assert.strictEqual('Bubba Gump Shrimp Co.', contact.org[0]);
        assert.strictEqual('Shrimp Man', contact.jobTitle[0]);

        assert.strictEqual('work', contact.tel[0].type[0]);
        assert.strictEqual('+1-111-555-1212', contact.tel[0].value);
        assert.strictEqual('home', contact.tel[1].type[0]);
        assert.strictEqual('+1-404-555-1212', contact.tel[1].value);

        assert.strictEqual('work', contact.adr[0].type[0]);

        assert.strictEqual('100 Waters Edge', contact.adr[0].streetAddress);
        assert.strictEqual('Baytown', contact.adr[0].locality);
        assert.strictEqual('LA', contact.adr[0].region);
        assert.strictEqual('30314', contact.adr[0].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[0].countryName);
        assert.strictEqual('home', contact.adr[1].type[0]);
        assert.strictEqual('42 Plantation St.', contact.adr[1].streetAddress);
        assert.strictEqual('Baytown', contact.adr[1].locality);
        assert.strictEqual('LA', contact.adr[1].region);
        assert.strictEqual('30314', contact.adr[1].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[1].countryName);

        assert.strictEqual('forrestgump@example.com', contact.email[0].value);
        toDataUri(contact.photo[0], function(r) {
          assert.strictEqual(b64Photo,
           VCardReader.parseDataUri(r.result).value);
          assert.strictEqual('image/bmp', contact.photo[0].type);
          done();
        });
      };
    });
  });
});
