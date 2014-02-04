/* global MockLazyLoader, MockMatcher, MockMozContacts, MocksHelper,
mozContact, VCFReader, require, require, assert, console,
suite, setup, suiteSetup, suiteTeardown, test, MockRest */

'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_contacts_match.js');
requireApp('communications/contacts/js/utilities/vcard_parser.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('system/shared/test/unit/mocks/mock_moz_contact.js');
requireApp('communications/gmail/test/unit/mock_rest.js');

function parseDataUri(str) {
  var re = /^data:(.+);(charset=([^;]+))?;?base64,(.*)$/;
  var matches = re.exec(str);

  if (matches) {
    return {
      mime: matches[1],
      charset: matches[3],
      value: matches[4]
    };
  }
  return null;
}

function b64toBlob(b64Data, contentType, sliceSize) {
  if (!b64Data) {
    console.error('No b64 data provided to convert to blob.');
    return;
  }

  contentType = contentType || '';
  sliceSize = sliceSize || 1024;

  function charCodeFromCharacter(c) {
    return c.charCodeAt(0);
  }

  var byteCharacters = atob(b64Data);
  var byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);
    var byteNumbers = Array.prototype.map.call(slice, charCodeFromCharacter);
    var byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, {type: contentType});
}

function comparePhoto(photo, cb) {
  var reader = new window.FileReader();
  reader.readAsDataURL(photo);
  reader.onloadend = cb.bind(null, reader);
}

var b64Photo = 'Qk02BAAAAAAAADYAAAAoAAAAEAAAAPD///8BACAAAAAAAAAAAABiBwAAYgc' +
'AAAAAAAAAAAAA///////////////////////////////////////////////////+//////////' +
'///////////////////////////////////' +
'//////////////////////////V0s3/b21l/1pbVf' +
'9ydHL/u8HB//D09f/29vb///////////////////////////////////////Lx8P9ycWv/EhEO' +
'/wAAAP8AAgD/Gh0Z/15mav+tt7z/6+zr/////////////v////////////////////////+IiY' +
'f/AgYF/wAAAP8AAAD/AAAA/x8iI/88Ojv/e3l6///+/v//////////////////////////////' +
'///p5+f/am5z/xoeI/8iKDH/HSIr/ztATP+wtL//sbfC/zI4P//Ky8r///////////////////' +
'////7+/f/s7O3/vcDH/2Fkbf8+Qk7/foSW/5Wcsv+5vtP/7ezz//////97g5P/j5Oh//f4+P//' +
'////+/v7//Py8v/z8vP/9/j5/8jL2/8zNkD/MDM4/3Nydf/X0+H/0cvZ/7Srrv/Hvrz/h4uX/2' +
'Vsf/+5vcP/5OXj//Tz8//5+fn///////7+/v+eoa3/NjxE/2Vnaf9vbGr/pqSt/+ro8v+xqrP/' +
'6ePi/4SLnP85QE//e4SQ/5CWmv////////////z8+//X1tf/kZWc/09UXP9hY2f/TEhL/62twP' +
'/o6vP/n5ij/9LM0f+WnbX/PkRS/4CFkv99gor//f39//j39//19PP/+Pj3//////+ysrj/cnqP' +
'/21viv/c2On/9PL3//Hv+v/l5/T/x8jd/7Cvv//Y0NX/5NzD//X19f/7+/v///////Py9v/W3u' +
'f/z9Xa/4WFm/9UVGn/tK3D/+/o8v/Y0uD/9fL8/+3q9f/w7fn/+/n+////////////////////' +
'///08/b/2eLo/8XT2P9zdYb/XFxy/8S80//68vz/urTE/9XU5//j4+//9vX6////////////7e' +
'/u/+Dk5v/a4OT/8vf5///////g5+n/kZKe/25of/9sa3D/ZGNn/2pndf/ExdP/0tTf/+nm4//+' +
'/Pr//////87V2v+KmKf/cYOV/3mMn/+NnK3/TVll/1dYZP9kYHn/ODBG/yAcMP9fXW//ubzK/9' +
'PW3/9JREX/OTIu/7OxsP//////y9HZ/4WSov9xfo//TVhx/x8nNP8ZGiH/Y2F//3Bphv9vZYj/' +
'mZm3/7C1yv/Ey9n/DREX/wYIDf9ZaYb//v7+/8vS2v+Hk6T/h4+c/2hxg/8iJi//AwQE/0pHYP' +
'9nX4f/kIuv/4WIo/+GjaT/doOb/wECBv8dIS3/VWWL/w==';

if (!window.contacts) {
  window.contacts = null;
}

if (!window.LazyLoader) {
  window.LazyLoader = null;
}

if (!window.utils) {
  window.utils = null;
}

if (!window.Rest) {
  window.Rest = null;
}

function loadVCF(filename, cb) {
  var oReq = new XMLHttpRequest();
  oReq.open(
    'get', '/apps/communications/contacts/test/unit/' + filename, true);
  oReq.send();
  oReq.onload = function() {
    var vcf = this.responseText;
    cb(new VCFReader(vcf));
  };
}

var mocksHelperForVCardParsing = new MocksHelper([
  'mozContact'
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

  var realMozContacts, realMatcher, realLazyLoader, realUtils, realRest;
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

      realLazyLoader = window.LazyLoader;
      window.LazyLoader = MockLazyLoader;

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
          b64toBlob(b64Photo, 'image/bmp'),
        type: 'success'
      });
    });

    suiteTeardown(function() {
      navigator.mozContacts = realMozContacts;
      window.contacts.Matcher = realMatcher;
      window.LazyLoader = realLazyLoader;
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
      loadVCF('vcard_21.vcf', function(reader) {
      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();
      reader.process(function import_finish(total) {
        assert.strictEqual(1, total);
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

          done();
        };
      });
      });
    });

    test('- should return a correct JSON object from VCF 3.0', function(done) {
      loadVCF('vcard_3.vcf', function(reader) {
      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(total) {
        assert.strictEqual(1, total);

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

          comparePhoto(contact.photo[0], function(r) {
            assert.strictEqual(b64Photo, parseDataUri(r.result).value);
            assert.strictEqual('image/bmp', contact.photo[0].type);
            done();
          });
        };
      });
      });
    });

    test('- should return a correct JSON object from VCF 4.0', function(done) {
      loadVCF('vcard_4.vcf', function(reader) {

      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(total) {
        assert.strictEqual(1, total);
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
          comparePhoto(contact.photo[0], function(r) {
            assert.strictEqual(b64Photo, parseDataUri(r.result).value);
            assert.strictEqual('image/bmp', contact.photo[0].type);
            done();
          });
        };
      });
      });
    });

    test('- should return a correct JSON object from weird encoding',
      function(done) {

      loadVCF('vcard_2_qp.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(total) {
          assert.strictEqual(2, total);

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
      loadVCF('vcard_4_wrong.vcf', function(reader) {
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
      loadVCF('vcard_3_utf8.vcf', function(reader) {
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
            //assert.ok(contact.tel[1].type.indexOf('WORK') > -1)
            assert.strictEqual('home', contact.email[0].type[0]);
            assert.strictEqual('example@example.org', contact.email[0].value);
            done();
          };
        });
      });
    });

    test('- Multiline quoted string', function(done) {
      loadVCF('vcard_2_qp_utf8.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(total) {
          assert.equal(1, total);
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
      loadVCF('vcard_21_multiple.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(total) {
          assert.equal(6, total);
          done();
        });
      });
    });
    test('- vcard 2.1 with embedded photo', function(done) {
      loadVCF('vcard_21_photo.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(total) {
          assert.equal(3, total);
          var req = navigator.mozContacts.find();
          req.onsuccess = function() {
            var contact = req.result[0];
            comparePhoto(contact.photo[0], function(r) {
              assert.strictEqual(b64Photo, parseDataUri(r.result).value);
              assert.strictEqual('image/bmp', contact.photo[0].type);
              done();
            });
          };
        });
      });
    });
    test('- vcard 2.1 with URL photo', function(done) {
      loadVCF('vcard_21_photo.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(total) {
          assert.equal(3, total);
          var req = navigator.mozContacts.find();
          req.onsuccess = function() {
            var contact = req.result[1];
            comparePhoto(contact.photo[0], function(r) {
              assert.strictEqual(b64Photo, parseDataUri(r.result).value);
              assert.strictEqual('image/bmp', contact.photo[0].type);
              done();
            });
          };
        });
      });
    });
    test('- vcard 2.1 with bad b64 data', function(done) {
      loadVCF('vcard_21_photo.vcf', function(reader) {
        reader.onread = stub();
        reader.onimported = stub();
        reader.onerror = stub();

        reader.process(function import_finish(total) {
          assert.equal(3, total);
          var req = navigator.mozContacts.find();
          req.onsuccess = function() {
            var contact = req.result[2];
            assert.ok(typeof contact.photo, 'undefined');
            done();
          };
        });
      });
    });
  });
});
