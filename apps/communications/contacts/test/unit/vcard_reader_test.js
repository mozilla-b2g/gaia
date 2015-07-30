/* global VCardReader, b64Photo, MockRest, MocksHelper,
   MockThumbnailImage, utils */

'use strict';

require('/shared/js/mime_mapper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/contacts/import/utilities/vcard_reader.js');

requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/contacts/test/unit/import/mock_rest.js');
requireApp('communications/contacts/test/unit/base64_photo.js');
requireApp('communications/contacts/test/unit/mock_image_thumbnail.js');

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
      },
      'thumbnailImage': MockThumbnailImage
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
        done(function() {
          var contact = evt.target.result;
          assert.isTrue(typeof contact !== 'undefined' && contact !== null);
        });
      };
    });

    test('should be calling with no result when done', function(done) {
      var cursor = reader.getAll();

      cursor.onsuccess = function(evt) {
        if (evt.target.result) {
          cursor.continue();
        }
        else {
          done(function() {
            assert.ok('ok');
          });
        }
      };
    });

    test('contact fields are propertly parsed ', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;
        done(function() {
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
        });
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
      cursor.onsuccess = function(evt) {
        if (evt.target.result) {
          contactCount++;
          cursor.continue();
        }
        else {
          done(function() {
             assert.strictEqual(contactCount, 6);
          });
        }
      };
    });

  });

  suite('reading a VCard 2.1 file with photo', function() {

    var contacts;
    var cursor;

    function readContacts(cb) {
      var count = 0;
      cursor.onsuccess = function(evt) {
        if (evt.target.result) {
          contacts[count++] = evt.target.result;
          cursor.continue();
        }
        else {
          cb();
        }
      };
    }

    setup(function(done) {
      contacts = [];
      initializeVCardReader('vcard_21_photo.vcf', function(reader) {
        cursor = reader.getAll();
        done();
      });
    });

    test('contact with embedded photo', function(done) {
      // Checking utils.thumbnailImage was called
      this.sinon.spy(utils, 'thumbnailImage');
      readContacts(function() {
        assert.ok(utils.thumbnailImage.called);
        toDataUri(contacts[0].photo[0], function(r) {
          done(function() {
            assert.strictEqual(b64Photo,
                                VCardReader.parseDataUri(r.result).value);
            assert.strictEqual('image/bmp', contacts[0].photo[0].type);
            // No thumbnailImage was created because the thumbnail is equal
            // to the blob image
            assert.equal(1, contacts[0].photo.length);
          });
        });
      });
    });

    test('contact with URL photo', function(done) {
      readContacts(function() {
        toDataUri(contacts[1].photo[0], function(r) {
          done(function() {
            assert.strictEqual(b64Photo,
                              VCardReader.parseDataUri(r.result).value);
            assert.strictEqual('image/bmp', contacts[1].photo[0].type);
          });
        });
      });
    });

    test('contact with bad b64 data', function() {
      readContacts(function() {
        assert.ok(typeof contacts[2].photo, 'undefined');
      });
    });

    test('contact with embedded photo generates thumbnail', function(done) {
      var fakeThumbnail = 'thumbnail create correctly';
      this.sinon.stub(utils, 'thumbnailImage', function(blob, callback) {
        callback(fakeThumbnail);
      });
      readContacts(function() {
        done(function() {
          assert.equal(2, contacts[3].photo.length);
          assert.equal(fakeThumbnail, contacts[3].photo[1]);
        });
      });
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
      var contacts = [];
      var cursor = reader.getAll();

      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;
        if (contact) {
          contacts.push(contact);
          cursor.continue();
        }
        else {
          done(function() {
            assert.strictEqual('Tanja Tanzbein', contacts[0].name[0]);
            assert.strictEqual('Tanja', contacts[0].givenName[0]);
            assert.strictEqual('work', contacts[0].tel[0].type[0]);
            assert.strictEqual('+3434269362248', contacts[0].tel[0].value);

            assert.strictEqual('Thomas Rücker', contacts[1].name[0]);
            assert.strictEqual('Thomas', contacts[1].givenName[0]);
            assert.strictEqual('mobile', contacts[1].tel[0].type[0]);
            assert.strictEqual('+72682252873', contacts[1].tel[0].value);
          });
        }
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

        done(function() {
          assert.strictEqual(
                        'Freunde und Förderer TU Dresden', contact.org[0]);
        });
      };
    });

  });

  suite('reading a VCard 3.0 file', function() {
    var reader;
    setup(function(done) {
      initializeVCardReader('vcard_3_grouped.vcf', function(r) {
        reader = r;
        done();
      });
    });

    test('contact data should be properly parsed', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;

        toDataUri(contact.photo[0], function(r) {
          done(function() {
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
            assert.strictEqual('42 Plantation St.',
                               contact.adr[1].streetAddress);
            assert.strictEqual('Baytown', contact.adr[1].locality);
            assert.strictEqual('LA', contact.adr[1].region);
            assert.strictEqual('30314', contact.adr[1].postalCode);
            assert.strictEqual('United States of America',
              contact.adr[1].countryName);

            assert.strictEqual('forrestgump@example.com',
                               contact.email[0].value);
            assert.strictEqual('internet', contact.email[0].type[0]);

            assert.strictEqual(b64Photo,
                                VCardReader.parseDataUri(r.result).value);

            assert.strictEqual('image/bmp', contact.photo[0].type);
          });
        });
      };
    });
  });


  suite('reading a VCard 3.0 file with grouped properties', function() {
    var reader;
    setup(function(done) {
      initializeVCardReader('vcard_3_grouped.vcf', function(r) {
        reader = r;
        done();
      });
    });

    test('contact data should be properly parsed', function(done) {
      var cursor = reader.getAll();
      cursor.onsuccess = function(evt) {
        var contact = evt.target.result;

        toDataUri(contact.photo[0], function(r) {
          done(function() {
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
            assert.strictEqual('42 Plantation St.',
                               contact.adr[1].streetAddress);
            assert.strictEqual('Baytown', contact.adr[1].locality);
            assert.strictEqual('LA', contact.adr[1].region);
            assert.strictEqual('30314', contact.adr[1].postalCode);
            assert.strictEqual('United States of America',
              contact.adr[1].countryName);

            assert.strictEqual('forrestgump@example.com',
                               contact.email[0].value);
            assert.strictEqual('internet', contact.email[0].type[0]);

            assert.strictEqual(b64Photo,
                                VCardReader.parseDataUri(r.result).value);

            assert.strictEqual('image/bmp', contact.photo[0].type);
          });
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

        done(function() {
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
        });
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

        toDataUri(contact.photo[0], function(r) {
          done(function() {
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
            assert.strictEqual('42 Plantation St.',
                               contact.adr[1].streetAddress);
            assert.strictEqual('Baytown', contact.adr[1].locality);
            assert.strictEqual('LA', contact.adr[1].region);
            assert.strictEqual('30314', contact.adr[1].postalCode);
            assert.strictEqual('United States of America',
              contact.adr[1].countryName);

            assert.strictEqual('forrestgump@example.com',
                               contact.email[0].value);
            assert.strictEqual(b64Photo,
                                VCardReader.parseDataUri(r.result).value);
            assert.strictEqual('image/bmp', contact.photo[0].type);
          });
        });
      };
    });
  });
});
