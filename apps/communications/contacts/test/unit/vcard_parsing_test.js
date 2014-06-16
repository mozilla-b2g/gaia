/* global MockMatcher, MockMozContacts, MocksHelper,
mozContact, VCFReader, require, assert, b64Photo,
suite, setup, suiteSetup, suiteTeardown, test, MockRest,
MockAdaptAndMerge */

'use strict';

require('/shared/js/mime_mapper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_moz_contact.js');
require('/shared/js/contacts/import/utilities/vcard_parser.js');

requireApp('communications/contacts/test/unit/mock_contacts_match.js');
requireApp('communications/contacts/test/unit/' +
 'mock_contacts_adapt_and_merge.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('/shared/test/unit/mocks/mock_moz_contact.js');
requireApp('communications/contacts/test/unit/import/mock_rest.js');
requireApp('communications/contacts/test/unit/base64_photo.js');

function toDataUri(photo, cb) {
  var reader = new window.FileReader();
  reader.readAsDataURL(photo);
  reader.onloadend = cb.bind(null, reader);
}

if (!window.contacts) {
  window.contacts = null;
}

if (!window.utils) {
  window.utils = null;
}

if (!window.Rest) {
  window.Rest = null;
}

function initializeVCFReader(filename, cb) {
  var oReq = new XMLHttpRequest();
  oReq.open(
    'get', '/apps/communications/contacts/test/unit/vcards/' + filename, true);
  oReq.send();
  oReq.onload = function() {
    var vcf = this.responseText;
    cb(new VCFReader(vcf));
  };
}

var mocksHelperForVCardParsing = new MocksHelper([
  'LazyLoader','mozContact'
]).init();

suite('vCard parsing settings', function() {
  function stub(additionalCode, ret) {
    if (additionalCode && typeof additionalCode !== 'function') {
      ret = additionalCode;
    }

    var nfn = function() {
      nfn.callCount++;
      nfn.calledWith = [].slice.call(arguments);

      if (typeof additionalCode === 'function') {
        additionalCode.apply(this, arguments);
      }

      return ret;
    };
    nfn.callCount = 0;
    return nfn;
  }

  mocksHelperForVCardParsing.attachTestHelpers();

  var realMozContacts, realMatcher, realUtils, realRest, realMerge;
  suite('SD Card import', function() {
    setup(function() {
      navigator.mozContacts.contacts = [];
    });

    suiteSetup(function() {
      realMozContacts = navigator.mozContacts;
      navigator.mozContacts = MockMozContacts;
      navigator.mozContacts.find = function mockMozContactsFind() {
        var self = this;
        var req = {
          set onsuccess(cb) {
            req.result = self.contacts;
            cb();
          },
          get onsuccess() {},
          set onerror(cb) {},
          get onerror() {}
        };
        return req;
      };

      window.contacts = window.contacts || {};
      realMatcher = window.contacts.Matcher;
      window.contacts.Matcher = MockMatcher;

      realMerge = window.contacts.adaptAndMerge;
      window.contacts.adaptAndMerge = MockAdaptAndMerge;

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
          VCFReader.utils.b64toBlob(b64Photo, 'image/bmp'),
        type: 'success'
      });
    });

    suiteTeardown(function() {
      navigator.mozContacts = realMozContacts;
      window.contacts.Matcher = realMatcher;
      window.contacts.adaptAndMerge = realMerge;
      window.utils = realUtils;
      window.Rest = realRest;
    });

    test('- should properly decode Quoted Printable texts ', function(done) {
      var str = 'áàéèíìóòúùäëïöü¡¡¡·=';
      var realEncoded = '=C3=A1=C3=A0=C3=A9=C3=A8=C3=AD=C3=AC=C3=B3=C3=B2=C3' +
        '=BA=C3=B9=C3=A4=C3=AB=C3=AF=C3=B6=C3=BC=C2=A1=C2=A1=C2=A1=C2=B7=3D';

      var encoded = VCFReader._decodeQuoted(realEncoded);
      assert.strictEqual(encoded, str);
      done();
    });

    test('- test for processing name 1 ', function(done) {
      var contact = new mozContact();
      var data = {
        fn: [{
            meta: {},
            value: ['Johnny']
          }
        ],
        n: [{
            value: [
              'Doe', 'John', 'Richard', 'Mr.', 'Jr.'
            ],
            meta: {}
          }
        ]
      };
      VCFReader.processName(data, contact);

      assert.strictEqual(contact.name[0], 'Johnny');
      assert.strictEqual(contact.familyName[0], 'Doe');
      assert.strictEqual(contact.givenName[0], 'John');
      assert.strictEqual(contact.additionalName[0], 'Richard');
      assert.strictEqual(contact.honorificPrefix[0], 'Mr.');
      assert.strictEqual(contact.honorificSuffix[0], 'Jr.');
      done();
    });

    test('- test for processing name 2 ', function(done) {
      var contact = new mozContact();
      var data = {
        n: [{
            value: [
              'Doe', 'John', 'Richard', 'Mr.', 'Jr.'
            ],
            meta: {}
          }
        ]
      };
      VCFReader.processName(data, contact);

      assert.strictEqual(contact.name[0], 'Doe John Richard Mr. Jr.');
      assert.strictEqual(contact.familyName[0], 'Doe');
      assert.strictEqual(contact.givenName[0], 'John');
      assert.strictEqual(contact.additionalName[0], 'Richard');
      assert.strictEqual(contact.honorificPrefix[0], 'Mr.');
      assert.strictEqual(contact.honorificSuffix[0], 'Jr.');
      done();
    });

    test('- test for processing name 2 ', function(done) {
      var contact = new mozContact();
      var data = {
        adr: [{
            meta: {
              type: 'WORK'
            },
            value: [
              '', '',
              '650 Castro Street',
              'Mountain View',
              'California',
              '94041-2021',
              'USA'
            ]
          }
        ]
      };
      VCFReader.processAddr(data, contact);

      assert.strictEqual(contact.adr[0].streetAddress, '650 Castro Street');
      assert.strictEqual(contact.adr[0].locality, 'Mountain View');
      assert.strictEqual(contact.adr[0].region, 'California');
      assert.strictEqual(contact.adr[0].postalCode, '94041-2021');
      assert.strictEqual(contact.adr[0].countryName, 'USA');
      done();
    });

    test('- should return a correct JSON object from VCF 2.1 ', function(done) {
      initializeVCFReader('vcard_21.vcf', function(reader) {
      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();
      reader.process(function import_finish(result) {
        assert.strictEqual(1, result.length);
        assert.strictEqual(1, reader.onread.callCount);
        assert.strictEqual(1, reader.onimported.callCount);

        assert.strictEqual(0, reader.onerror.callCount);
        var req = navigator.mozContacts.find();
        req.onsuccess = function(contacts) {
          var contact = req.result[0];

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
    });

    test('- should return a correct JSON object from VCF 3.0', function(done) {
      initializeVCFReader('vcard_3.vcf', function(reader) {
      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(result) {
        assert.strictEqual(1, result.length);

        assert.strictEqual(1, reader.onread.callCount);
        assert.strictEqual(1, reader.onimported.callCount);
        assert.strictEqual(0, reader.onerror.callCount);

        var req = navigator.mozContacts.find();
        req.onsuccess = function(contacts) {
          var contact = req.result[0];
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
             VCFReader.utils.parseDataUri(r.result).value);
            assert.strictEqual('image/bmp', contact.photo[0].type);
            done();
          });
        };
      });
      });
    });

    test('- should return a correct JSON object from VCF 4.0', function(done) {
      initializeVCFReader('vcard_4.vcf', function(reader) {

      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(result) {
        assert.strictEqual(1, result.length);
        assert.strictEqual(1, reader.onread.callCount);
        assert.strictEqual(1, reader.onimported.callCount);
        assert.strictEqual(0, reader.onerror.callCount);

        var req = navigator.mozContacts.find();
        req.onsuccess = function(contacts) {
          var contact = req.result[0];

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
             VCFReader.utils.parseDataUri(r.result).value);
            assert.strictEqual('image/bmp', contact.photo[0].type);
            done();
          });
        };
      });
      });
    });

    test(' - should return a correct JSON object from a merged contact vcard',
      function(done){
        initializeVCFReader('vcard_3_merged.vcf', function(reader) {

          reader.onread = stub();
          reader.onimported = stub();
          reader.onerror = stub();

          reader.process(function import_finish(result) {
            assert.strictEqual(1, result.length);
            assert.strictEqual(1, reader.onread.callCount);
            assert.strictEqual(1, reader.onimported.callCount);
            assert.strictEqual(0, reader.onerror.callCount);

            var req = navigator.mozContacts.find();
            req.onsuccess = function(contacts) {
              var contact = req.result[0];

              assert.strictEqual('Freddy Mercury', contact.name[0]);
              assert.strictEqual('Freddy', contact.givenName[0]);
              assert.strictEqual('Farrokh', contact.givenName[1]);
              assert.strictEqual('Mercury', contact.familyName[0]);
              assert.strictEqual('Bulsara', contact.familyName[1]);
              assert.strictEqual('Queen', contact.org[0]);

              assert.strictEqual('mobile', contact.tel[0].type[0]);
              assert.strictEqual('(111) 555-1212', contact.tel[0].value);
              assert.strictEqual('home', contact.tel[1].type[0]);
              assert.strictEqual('(404) 555-1212', contact.tel[1].value);
              assert.strictEqual('freddy@queen.com',
                                  contact.email[0].value);
              done();
            };
          });
        });
      });

    test('- should return a correct JSON object from weird encoding',
      function(done) {

      initializeVCFReader('vcard_2_qp.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(result) {
          assert.strictEqual(2, result.length);

          assert.strictEqual(1, reader.onread.callCount);
          assert.strictEqual(2, reader.onimported.callCount);
          assert.strictEqual(0, reader.onerror.callCount);

          var req = navigator.mozContacts.find();
          req.onsuccess = function() {
            var contact = req.result[0];
            assert.strictEqual('Tanja Tanzbein', contact.name[0]);
            assert.strictEqual('Tanja', contact.givenName[0]);
            assert.strictEqual('work', contact.tel[0].type[0]);
            assert.strictEqual('+3434269362248', contact.tel[0].value);

            var contact2 = req.result[1];
            assert.strictEqual('Thomas Rücker', contact2.name[0]);
            assert.strictEqual('Thomas', contact2.givenName[0]);
            assert.strictEqual('mobile', contact2.tel[0].type[0]);
            assert.strictEqual('+72682252873', contact2.tel[0].value);

            done();
          };
        });
      });
    });

    test('- should return a single entry', function(done) {
      initializeVCFReader('vcard_4_wrong.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(total) {
          //assert.strictEqual(1, total);
          done();
        });
      });
    });

    test('- Test for UTF8 charset', function(done) {
      initializeVCFReader('vcard_3_utf8.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(total) {
          var req = navigator.mozContacts.find();
          req.onsuccess = function(contacts) {
            var contact = req.result[0];
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
    });

    test('- Multiline quoted string', function(done) {
      initializeVCFReader('vcard_2_qp_utf8.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(result) {
          assert.equal(1, result.length);
          var req = navigator.mozContacts.find();
          req.onsuccess = function(contacts) {
            var contact = req.result[0];
            assert.strictEqual(
              'Freunde und Förderer TU Dresden', contact.org[0]);
            done();
          };
        });
      });
    });

    test('- vcards with more than 5 elements', function(done) {
      initializeVCFReader('vcard_21_multiple.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(result) {
          assert.equal(6, result.length);
          done();
        });
      });
    });
    test('- vcard 2.1 with embedded photo', function(done) {
      initializeVCFReader('vcard_21_photo.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(result) {
          assert.equal(4, result.length);
          var req = navigator.mozContacts.find();
          req.onsuccess = function() {
            var contact = req.result[0];
            toDataUri(contact.photo[0], function(r) {
              assert.strictEqual(b64Photo,
               VCFReader.utils.parseDataUri(r.result).value);
              assert.strictEqual('image/bmp', contact.photo[0].type);
              done();
            });
          };
        });
      });
    });
    test('- vcard 2.1 with URL photo', function(done) {
      initializeVCFReader('vcard_21_photo.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(result) {
          assert.equal(4, result.length);
          var req = navigator.mozContacts.find();
          req.onsuccess = function() {
            var contact = req.result[1];
            toDataUri(contact.photo[0], function(r) {
              assert.strictEqual(b64Photo,
               VCFReader.utils.parseDataUri(r.result).value);
              assert.strictEqual('image/bmp', contact.photo[0].type);
              done();
            });
          };
        });
      });
    });
    test('- vcard 2.1 with bad b64 data', function(done) {
      initializeVCFReader('vcard_21_photo.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(result) {
          assert.equal(4, result.length);
          var req = navigator.mozContacts.find();
          req.onsuccess = function() {
            var contact = req.result[2];
            assert.ok(typeof contact.photo, 'undefined');
            done();
          };
        });
      });
    });
    test('- vcard 2.1 with embedded photo in multiple lines', function(done) {
      initializeVCFReader('vcard_21_photo.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(result) {
          assert.equal(4, result.length);
          var req = navigator.mozContacts.find();
          req.onsuccess = function() {
            var contact = req.result[3];
            toDataUri(contact.photo[0], function(r) {
              assert.strictEqual(b64Photo,
               VCFReader.utils.parseDataUri(r.result).value);
              assert.strictEqual('image/bmp', contact.photo[0].type);
              done();
            });
          };
        });
      });
    });

    test('- vcard parser must return id of matched contact', function(done) {
      // Force the matcher to find a contact with a known id
      var matchStub = sinon.stub(window.contacts.Matcher, 'match',
       function(contact, type, cbs) {
        cbs.onmatch([]);
      });
      var mergeStub = sinon.stub(window.contacts, 'adaptAndMerge',
       function (contact, matches, cbs) {
        cbs.success({id: 1});
      });
      initializeVCFReader('vcard_21.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();
        reader.process(function import_finish(result) {
          sinon.assert.calledOnce(matchStub);
          sinon.assert.calledOnce(mergeStub);
          assert.isNotNull(result);
          assert.ok(Array.isArray(result));
          assert.equal(result.length, 1);
          assert.equal(result[0].id, 1);
          matchStub.restore();
          mergeStub.restore();
          done();
        });
      });
    });
  });
});
