/*global MockL10n, Utils, MockContact, FixturePhones,
         MockContacts, MockMozPhoneNumberService */

'use strict';

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_navigator_mozphonenumberservice.js');
requireApp('sms/js/utils.js');

suite('Utils', function() {
  var nativeMozL10n = navigator.mozL10n;
  var nmpns = navigator.mozPhoneNumberService;

  suiteSetup(function() {
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  suite('Utils.escapeRegex', function() {

    test('functional', function() {
      assert.equal(
        Utils.escapeRegex('\\^$*+?.[]{}-'),
        '\\\\\\^\\$\\*\\+\\?\\.\\[\\]\\{\\}\\-'
      );
    });

    test('+99', function() {
      assert.equal(Utils.escapeRegex('+99'), '\\+99');
    });

    test('1-800-555-1212', function() {
      assert.equal(Utils.escapeRegex('1-800-555-1212'), '1\\-800\\-555\\-1212');
    });

    test('First Last', function() {
      assert.equal(Utils.escapeRegex('First Last'), 'First Last');
    });

    test('invalid', function() {
      var expect = '';

      assert.equal(Utils.escapeRegex(0), expect);
      assert.equal(Utils.escapeRegex(false), expect);
      assert.equal(Utils.escapeRegex(true), expect);
      assert.equal(Utils.escapeRegex(null), expect);
      assert.equal(Utils.escapeRegex({}), expect);
      assert.equal(Utils.escapeRegex([]), expect);
    });
  });

  /*

  Omit this test, pending:
  Bug 847975 - [MMS][SMS] remove use of "dtf" alias from SMS
  https://bugzilla.mozilla.org/show_bug.cgi?id=847975

  suite('Utils.getFormattedHour', function() {
    var time = 1362166084256;

    test('([String|Number|Date])', function() {
      var expect = 'Fri Mar 01 2013 14:28:04 GMT-0500 (EST)';
      var fixtures = {
        string: time + '',
        number: time,
        date: new Date(time)
      };

      assert.equal(Utils.getFormattedHour(fixtures.string), expect);
      assert.equal(Utils.getFormattedHour(fixtures.number), expect);
      assert.equal(Utils.getFormattedHour(fixtures.date), expect);
    });
  });
  */


  suite('Utils.getDayDate', function() {
    test('(UTSMS)', function() {
      var date = new Date(1362166084256);
      var offset = (+date - date.getTimezoneOffset() * 60000) % 86400000;

      assert.equal(
        Utils.getDayDate(1362166084256),
        date.getTime() - offset // midnight
      );
    });
  });

  suite('Utils.getHeaderDate', function() {
    var spy;

    setup(function() {
      // choose a date that is far away from a DST change
      var today = new Date('Tue Jan 29 2013 14:18:15 GMT+0100 (CET)').getTime();
      this.sinon.useFakeTimers(today);
      spy = this.sinon.spy(MockL10n.DateTimeFormat.prototype,
        'localeFormat');
    });

    test('(today [String|Number|Date])', function() {
      var expect = 'today';
      var today = Date.now();
      var fixtures = {
        string: today + '',
        number: today,
        date: new Date()
      };

      assert.equal(Utils.getHeaderDate(fixtures.string), expect);
      assert.equal(Utils.getHeaderDate(fixtures.number), expect);
      assert.equal(Utils.getHeaderDate(fixtures.date), expect);
    });

    test('(yesterday [String|Number|Date])', function() {
      var expect = 'yesterday';
      var yesterday = Date.now() - 86400000;
      var fixtures = {
        string: yesterday + '',
        number: yesterday,
        date: new Date(yesterday)
      };

      assert.equal(Utils.getHeaderDate(fixtures.string), expect);
      assert.equal(Utils.getHeaderDate(fixtures.number), expect);
      assert.equal(Utils.getHeaderDate(fixtures.date), expect);
    });

    test('between 2 and 5 days ago', function() {
      for (var days = 2; days <= 5; days++) {
        var date = Date.now() - 86400000 * days;
        Utils.getHeaderDate(date);
        assert.ok(spy.called);
        assert.equal(+spy.args[0][0], +date);
        assert.equal(spy.args[0][1], '%A');
      }
    });

    test('more than 6 days ago', function() {
      var date = Date.now() - 86400000 * 6;
      Utils.getHeaderDate(date);
      assert.ok(spy.called);
      assert.equal(+spy.args[0][0], +date);
      assert.equal(spy.args[0][1], '%x');
    });

    test('future time case', function() {
      var date = Date.now() + 86400000 * 3;
      Utils.getHeaderDate(date);
      assert.ok(spy.called);
      assert.equal(+spy.args[0][0], +date);
      assert.equal(spy.args[0][1], '%x');
    });

    /*
      Related to:
      Bug 847975 - [MMS][SMS] remove use of "dtf" alias from SMS
      https://bugzilla.mozilla.org/show_bug.cgi?id=847975

      Needs a test for dates older then yesterday. Unfortunately,
      there appears to be issues with l10n module when running tests
      using the desktop automated test-agent.

      test('(epoch [String|Number])', function() {
      });
    */
  });

  suite('Utils.getContactDetails', function() {
    test('(number, contact)', function() {
      var contact = new MockContact();

      var details = Utils.getContactDetails('346578888888', contact);
      assert.deepEqual(details, {
        isContact: true,
        title: 'Pepito O\'Hare',
        name: 'Pepito O\'Hare',
        org: '',
        carrier: 'Mobile | TEF'
      });

      details = Utils.getContactDetails('12125559999', contact);
      assert.deepEqual(details, {
        isContact: true,
        title: 'Pepito O\'Hare',
        name: 'Pepito O\'Hare',
        org: '',
        carrier: 'Batphone | XXX'
      });
    });

    test('(number, null)', function() {
      var details = Utils.getContactDetails('346578888888', null);
      assert.deepEqual(details, {
        title: ''
      });
    });

    test('(number (wrong number), contact)', function() {
      var contact = new MockContact();

      var details = Utils.getContactDetails('99999999', contact);
      assert.deepEqual(details, {
        isContact: true,
        title: 'Pepito O\'Hare',
        name: 'Pepito O\'Hare',
        org: '',
        carrier: 'Mobile | TEF'
      });
    });

    test('(number, contact (blank information))', function() {
      var contact = new MockContact();

      // Remove the name value
      contact.name[0] = '';

      var details = Utils.getContactDetails('346578888888', contact);
      assert.deepEqual(details, {
        isContact: true,
        title: '',
        name: '',
        org: '',
        carrier: 'Mobile | TEF'
      });

    });

    test('(number, contact (has another number with same type and carrier))',
         function() {
      var contact = new MockContact();
      contact.tel[2] = {
        'value': '+346578889999',
        'type': ['Mobile'],
        'carrier': 'TEF'
      };

      var details = Utils.getContactDetails('+346578888888', contact);
      assert.deepEqual(details, {
        isContact: true,
        title: 'Pepito O\'Hare',
        name: 'Pepito O\'Hare',
        org: '',
        carrier: 'Mobile | +346578888888'
      });

    });

    test('(number, contact, { photoURL: true })', function() {
      var contact = new MockContact();
      contact.photo = [
        new Blob(['foo'], { type: 'text/plain' })
      ];

      var details = Utils.getContactDetails('999', contact, {
        photoURL: true
      });

      assert.isDefined(details.photoURL);
    });

    test('(number, contact, { photoURL: false })', function() {
      var contact = new MockContact();
      var details = Utils.getContactDetails('999', contact, {
        photoURL: false
      });

      assert.isUndefined(details.photoURL);
    });

    suite('Defensive', function() {

      test('tel is null', function() {
        var contact = new MockContact();
        contact.tel = null;

        var details = Utils.getContactDetails('0', contact);
        assert.deepEqual(details, {
          isContact: true,
          title: 'Pepito O\'Hare',
          name: 'Pepito O\'Hare',
          org: '',
          carrier: ''
        });
      });

      test('tel length is 0', function() {
        var contact = new MockContact();
        contact.tel.length = 0;

        var details = Utils.getContactDetails('0', contact);
        assert.deepEqual(details, {
          isContact: true,
          title: 'Pepito O\'Hare',
          name: 'Pepito O\'Hare',
          org: '',
          carrier: ''
        });
      });

      test('first tel object value is empty', function() {
        var contact = new MockContact();
        contact.tel[0].value = '';

        var details = Utils.getContactDetails('0', contact);
        assert.deepEqual(details, {
          isContact: true,
          title: 'Pepito O\'Hare',
          name: 'Pepito O\'Hare',
          org: '',
          carrier: ''
        });
      });

      test('tel first is empty, uses number to find alt', function() {
        var contact = new MockContact();
        contact.tel[0].value = '';

        var details = Utils.getContactDetails('+12125559999', contact);
        assert.deepEqual(details, {
          isContact: true,
          title: 'Pepito O\'Hare',
          name: 'Pepito O\'Hare',
          org: '',
          carrier: 'Batphone | XXX'
        });
      });

      test('Multiple contact entries, showing the valid title', function() {
        var contacts = new MockContact.list([
          // Empty name should not show up
          { givenName: [''], familyName: [''] },
          { givenName: ['Jane'], familyName: ['Doozer'] }
        ]);
        contacts[0].name[0] = '';

        var details = Utils.getContactDetails('346578888888', contacts);
        assert.deepEqual(details, {
          isContact: true,
          title: 'Jane Doozer',
          name: 'Jane Doozer',
          org: '',
          carrier: 'Mobile | TEF'
        });
      });

      test('number is empty, apply organization name if exist', function() {
        var contact = new MockContact();

        // Remove the name value and add org name
        contact.name[0] = '';
        contact.org[0] = 'TEF';

        var details = Utils.getContactDetails('346578888888', contact);
        assert.deepEqual(details, {
          isContact: true,
          title: 'TEF',
          name: '',
          org: 'TEF',
          carrier: 'Mobile | TEF'
        });
      });
    });
  });

  suite('Utils.getCarrierTag', function() {
    /**
      1. If a phone number has carrier associated with it
          the output will be:

        type | carrier

      2. If there is no carrier associated with the phone number
          the output will be:

        type | phonenumber

      3. If for some reason a single contact has two phone numbers with
          the same type and the same carrier the output will be:

        type | phonenumber

      4. If for some reason a single contact has no name and no carrier,
          the output will be:

        type

      5. If for some reason a single contact has no name, no type
          and no carrier, the output will be nothing.
    */
    test('Single with carrier', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '101', type: ['Mobile'], carrier: 'Nynex'}
      ];

      var a = Utils.getCarrierTag('101', tel);

      assert.equal(a, 'Mobile | Nynex');
    });

    test('Single no carrier', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '201', type: ['Mobile'], carrier: null}
      ];

      var a = Utils.getCarrierTag('201', tel);

      assert.equal(a, 'Mobile | 201');
    });

    test('Single no name', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '201', type: ['Mobile'], carrier: 'Telco'}
      ];

      var a = Utils.getCarrierTag('201', tel, { name: '' });

      assert.equal(a, 'Mobile | Telco');
    });

    test('Single no name, no carrier', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '201', type: ['Mobile'], carrier: null}
      ];

      var a = Utils.getCarrierTag('201', tel, { name: '' });

      assert.equal(a, 'Mobile');
    });

    test('Single no name, no carrier, no type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '201', type: [], carrier: null}
      ];

      var a = Utils.getCarrierTag('201', tel, { name: '' });

      assert.equal(a, '');
    });

    test('Multi different carrier & type, match both', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '301', type: ['Mobile'], carrier: 'Nynex'},
        {value: '302', type: ['Home'], carrier: 'MCI'}
      ];

      var a = Utils.getCarrierTag('301', tel);
      var b = Utils.getCarrierTag('302', tel);

      assert.equal(a, 'Mobile | Nynex');
      assert.equal(b, 'Home | MCI');
    });

    test('Multi different carrier, match first', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '401', type: ['Mobile'], carrier: 'Nynex'},
        {value: '402', type: ['Home'], carrier: 'MCI'}
      ];

      var a = Utils.getCarrierTag('401', tel);

      assert.equal(a, 'Mobile | Nynex');
    });

    test('Multi different carrier, match second', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '501', type: ['Mobile'], carrier: 'Nynex'},
        {value: '502', type: ['Home'], carrier: 'MCI'}
      ];

      var a = Utils.getCarrierTag('502', tel);

      assert.equal(a, 'Home | MCI');
    });

    test('Multi same carrier & type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '601', type: ['Mobile'], carrier: 'Nynex'},
        {value: '602', type: ['Mobile'], carrier: 'Nynex'}
      ];

      var a = Utils.getCarrierTag('601', tel);
      var b = Utils.getCarrierTag('602', tel);

      assert.equal(a, 'Mobile | 601');
      assert.equal(b, 'Mobile | 602');
    });

    test('Multi same carrier, different type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '701', type: ['Mobile'], carrier: 'Nynex'},
        {value: '702', type: ['Home'], carrier: 'Nynex'}
      ];

      var a = Utils.getCarrierTag('701', tel);
      var b = Utils.getCarrierTag('702', tel);

      assert.equal(a, 'Mobile | Nynex');
      assert.equal(b, 'Home | Nynex');
    });

    test('Multi different carrier, same type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '801', type: ['Mobile'], carrier: 'Nynex'},
        {value: '802', type: ['Mobile'], carrier: 'MCI'}
      ];

      var a = Utils.getCarrierTag('801', tel);
      var b = Utils.getCarrierTag('802', tel);

      assert.equal(a, 'Mobile | Nynex');
      assert.equal(b, 'Mobile | MCI');
    });

    test('Multi different carrier, same type - intl number', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '1234567890', type: ['Mobile'], carrier: 'Nynex'},
        {value: '0987654321', type: ['Mobile'], carrier: 'MCI'}
      ];

      var a = Utils.getCarrierTag('+1234567890', tel);
      var b = Utils.getCarrierTag('+0987654321', tel);

      assert.equal(a, 'Mobile | Nynex');
      assert.equal(b, 'Mobile | MCI');
    });

    test('Multi different carrier, same type - never match', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '1234567890', type: ['Mobile'], carrier: 'Nynex'},
        {value: '0987654321', type: ['Mobile'], carrier: 'MCI'}
      ];

      var a = Utils.getCarrierTag('+9999999999', tel);
      var b = Utils.getCarrierTag('+9999999999', tel);

      assert.equal(a, '');
      assert.equal(b, '');
    });
  });

  suite('Utils.removeNonDialables(number)', function() {
    test('spaces', function() {
      assert.equal(
        Utils.removeNonDialables('888 999 5555'), '8889995555'
      );
    });

    test('non-digit, common chars', function() {
      assert.equal(
        Utils.removeNonDialables('(1A)2B 3C'), '123'
      );
    });
  });

  suite('Utils.probablyMatches(a, b)', function() {

    test('mozPhoneNumberService is null', function() {
      navigator.mozPhoneNumberService = null;

      assert.ok(
        Utils.probablyMatches('888 999 5555', '8889995555')
      );

      navigator.mozPhoneNumberService = nmpns;
    });

    test('spaces', function() {
      assert.ok(
        Utils.probablyMatches('888 999 5555', '8889995555')
      );
    });

    test('one number is undefined', function() {
      assert.isFalse(
        Utils.probablyMatches(undefined, '8889995555')
      );
    });

    test('both numbers are undefined', function() {
      assert.isFalse(
        Utils.probablyMatches(undefined, undefined)
      );
    });

    suite('Varied Cases', function() {
      FixturePhones.forEach(function(fixture) {
        var title = fixture.title;

        if (!fixture.isTestable) {
          title += ' (this feature is not really being tested)';
        }

        suite(title, function() {
          var values = fixture.values;

          if (!fixture.isTestable) {
            suiteSetup(function() {
              navigator.mozPhoneNumberService = MockMozPhoneNumberService;
            });

            suiteTeardown(function() {
              navigator.mozPhoneNumberService = nmpns;
            });
          }

          values.forEach(function(value) {
            values.forEach(function(versus) {
              test(value + ' probably matches ' + versus, function() {
                assert.ok(Utils.probablyMatches(value, versus));
              });
            });
          });
        });
      });
    });

    suite('Multirecipient comparisons', function() {
      var reference = ['800 555 1212', '636 555 3226', '800 867 5309'];

      test('Same array', function() {
        assert.ok(
          Utils.multiRecipientMatch(reference, reference)
        );
      });
      test('Shuffled', function() {
        assert.ok(
          Utils.multiRecipientMatch(reference, [].concat(reference).reverse())
        );
      });
      test('With holes', function() {
        var copy = [].concat(reference);
        assert.isFalse(
          Utils.multiRecipientMatch(
            reference,
            copy.splice(1, 1, undefined)
          )
        );
        assert.isFalse(
          Utils.multiRecipientMatch(
            reference,
            copy.splice(1, 1, null)
          )
        );
      });
      test('Different lengths', function() {
        assert.isFalse(
          // longer
          Utils.multiRecipientMatch(reference, reference.concat('800 867 5309'))
        );
        assert.isFalse(
          //shorter
          Utils.multiRecipientMatch(reference, reference.slice(-2))
        );
      });
      test('Array and string', function() {
        assert.isFalse(
          // String and array length are the same
          Utils.multiRecipientMatch(reference, '123')
        );
        // Single value array and string
        assert.ok(
          Utils.multiRecipientMatch(reference[0], [reference[0]])
        );
      });
    });

  });


  suite('Utils.getResizedImgBlob', function() {
    // a list of files in /test/unit/media/ to test resizing on
    var typeTestData = {
      'IMG_0554.bmp': null,
      'IMG_0554.gif': null,
      'IMG_0554.png': null,
      'IMG_0554.jpg': null
    };
    var qualityTestData = {
      'low_quality.jpg': null,
      'low_quality_resized.jpg': null,
      'default_quality_resized.jpg': null
    };

    suiteSetup(function(done) {
      // load test blobs for image resize testing
      var assetsNeeded = 0;

      function loadBlob(filename) {
        /*jshint validthis: true */
        assetsNeeded++;

        var req = new XMLHttpRequest();
        var testData = this;
        req.open('GET', '/test/unit/media/' + filename, true);
        req.responseType = 'blob';

        req.onload = function() {
          testData[filename] = req.response;
          if (--assetsNeeded === 0) {
            done();
          }
        };
        req.send();
      }

      // load the images
      Object.keys(typeTestData).forEach(loadBlob, typeTestData);
      Object.keys(qualityTestData).forEach(loadBlob, qualityTestData);
    });

    Object.keys(typeTestData).forEach(function(filename) {
      test(filename, function(done) {
        var blob = typeTestData[filename];
        // half the image size, or 100k, whichever is smaller
        var limit = Math.min(100000, (blob.size / 2));

        Utils.getResizedImgBlob(blob, limit, function(resizedBlob) {
          assert.isTrue(resizedBlob.size < limit,
            'resizedBlob is smaller than ' + limit);
          done();
        });
      });
    });

    test('Image size is smaller than limit', function(done) {
      var blob = qualityTestData['low_quality.jpg'];
      var limit = blob.size * 2;
      this.sinon.spy(Utils, 'resizeImageBlobWithRatio');
      var resizeSpy = Utils.resizeImageBlobWithRatio;

      Utils.getResizedImgBlob(blob, limit, function(resizedBlob) {
        assert.isTrue(resizedBlob === blob,
          'resizedBlob and blob should be the same');
        assert.equal(resizeSpy.callCount, 0);
        done();
      });
    });

    test('Resize low quality image', function(done) {
      var blob = qualityTestData['low_quality.jpg'];
      var resizedBlob = qualityTestData['low_quality_resized.jpg'];
      var defaultBlob = qualityTestData['default_quality_resized.jpg'];
      var limit = blob.size / 2;

      this.sinon.stub(HTMLCanvasElement.prototype,
        'toBlob', function(callback, type, quality) {
          if (quality) {
            callback(resizedBlob);
          } else {
            callback(defaultBlob);
          }
      });

      Utils.getResizedImgBlob(blob, limit, function(resizedBlob) {
        var toBlobSpy = HTMLCanvasElement.prototype.toBlob;
        assert.isTrue(resizedBlob.size < limit,
          'resizedBlob is smaller than ' + limit);
        assert.equal(toBlobSpy.callCount, 2);
        assert.equal(toBlobSpy.args[0][2], undefined);
        assert.equal(toBlobSpy.args[1][2], 0.75);
        done();
      });
    });

    test('Decrease image quality not working', function(done) {
      var blob = qualityTestData['low_quality.jpg'];
      var resizedBlob = qualityTestData['low_quality_resized.jpg'];
      var defaultBlob = qualityTestData['default_quality_resized.jpg'];
      var limit = blob.size / 2;

      this.sinon.spy(Utils, 'resizeImageBlobWithRatio');
      var resizeSpy = Utils.resizeImageBlobWithRatio;

      this.sinon.stub(HTMLCanvasElement.prototype,
        'toBlob', function(callback, type, quality) {
          var firstRatio = resizeSpy.firstCall.args[0].ratio;
          var lastRatio = resizeSpy.lastCall.args[0].ratio;
          if (lastRatio > firstRatio) {
            callback(resizedBlob);
          } else {
            callback(defaultBlob);
          }
      });

      Utils.getResizedImgBlob(blob, limit, function(resizedBlob) {
        assert.isTrue(resizedBlob.size < limit,
          'resizedBlob is smaller than ' + limit);
        var toBlobSpy = HTMLCanvasElement.prototype.toBlob;

        // Image quality testing should go down 3 qulity level first
        // than force the image rescale to smaller size.
        assert.equal(toBlobSpy.callCount, 5);
        assert.equal(toBlobSpy.args[0][2], undefined);
        assert.equal(toBlobSpy.args[1][2], 0.75);
        assert.equal(toBlobSpy.args[2][2], 0.5);
        assert.equal(toBlobSpy.args[3][2], 0.25);
        assert.equal(toBlobSpy.args[4][2], undefined);

        // Verify getResizedImgBlob is called twice and resizeRatio
        // parameter is set in sencond calls
        assert.equal(resizeSpy.callCount, 2);
        assert.ok(resizeSpy.firstCall.args[0].ratio <
          resizeSpy.lastCall.args[0].ratio);
        done();
      });
    });
  });

  suite('Utils.typeFromMimeType', function() {
    var tests = {
      'text/plain': 'text',
      'image/jpeg': 'img',
      'video/ogg': 'video',
      'audio/ogg': 'audio',
      'not-a-mime': null,
      'text': null,
      'appplication/video': null
    };

    Object.keys(tests).forEach(function(testIndex) {
      test(testIndex, function() {
        assert.equal(Utils.typeFromMimeType(testIndex), tests[testIndex]);
      });
    });

    suite('Defensive', function() {
      test('long string', function() {
        var longString = 'this/is/a/really/long/string/that/excedes/255/chars';
        longString += longString;
        longString += longString;
        assert.equal(Utils.typeFromMimeType(longString), null);
      });
      test('non-strings', function() {
        assert.equal(Utils.typeFromMimeType(null), null);
        assert.equal(Utils.typeFromMimeType({}), null);
        assert.equal(Utils.typeFromMimeType(0), null);
        assert.equal(Utils.typeFromMimeType(true), null);
      });

    });
  });

  suite('Utils.params', function() {
    var tests = {
      '?foo=bar&baz=1&quux=null': {foo: 'bar', baz: '1', quux: 'null'}
    };

    Object.keys(tests).forEach(function(testIndex) {
      test(testIndex, function() {
        assert.deepEqual(Utils.params(testIndex), tests[testIndex]);
      });
    });
  });
});

suite('getDisplayObject', function() {
  var nativeMozL10n = navigator.mozL10n;
  setup(function() {
    navigator.mozL10n = MockL10n;
    this.sinon.spy(navigator.mozL10n, 'get');
  });

  teardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  test('Tel object with carrier title and type', function() {
    var myTitle = 'My title';
    var type = 'Mobile';
    var carrier = 'Carrier';
    var value = 111111;
    var data = Utils.getDisplayObject(myTitle, {
      'value': value,
      'carrier': carrier,
      'type': [type]
    });

    assert.equal(data.name, myTitle);
    assert.equal(data.separator, ' | ');
    assert.equal(data.type, type);
    assert.equal(data.carrier, carrier + ', ');
    assert.equal(data.number, value);
  });

  test('Tel object without title and type', function() {
    var myTitle = 'My title';
    var type = 'Mobile';
    var value = 111111;
    var data = Utils.getDisplayObject(myTitle, {
      'value': value,
      'carrier': null,
      'type': [type]
    });

    assert.equal(data.name, myTitle);
    assert.equal(data.separator, ' | ');
    assert.equal(data.type, type);
    assert.equal(data.carrier, '');
    assert.equal(data.number, value);
  });

  test('Tel object with NO carrier title and NO type', function() {
    var myTitle = 'My title';
    var value = 111111;
    var data = Utils.getDisplayObject(myTitle, {
      'value': value
    });

    assert.equal(data.name, myTitle);
    assert.equal(data.separator, '');
    assert.equal(data.type, '');
    assert.equal(data.carrier, '');
    assert.equal(data.number, value);
  });

  test('Tel object with carrier title and type and NO title', function() {
    var type = 'Mobile';
    var carrier = 'Carrier';
    var value = 111111;
    var data = Utils.getDisplayObject(null, {
      'value': value,
      'carrier': carrier,
      'type': [type]
    });

    assert.equal(data.name, value);
    assert.equal(data.separator, ' | ');
    assert.equal(data.type, type);
    assert.equal(data.carrier, carrier + ', ');
    assert.equal(data.number, value);
  });
});

suite('getContactDisplayInfo', function() {
  var nativeMozL10n = navigator.mozL10n;

  setup(function() {
    navigator.mozL10n = MockL10n;
    this.sinon.spy(Utils, 'getContactDetails');
    this.sinon.spy(Utils, 'getDisplayObject');
  });

  teardown(function() {
    navigator.mozL10n = nativeMozL10n;
    Utils.getContactDetails.reset();
    Utils.getDisplayObject.reset();
  });

  test('Valid contact with phonenumber', function(done) {
    Utils.getContactDisplayInfo(
      MockContacts.findByPhoneNumber.bind(MockContacts),
      '+346578888888',
      function onData(data) {
        var tel = MockContact.list()[0].tel[0];
        assert.ok(Utils.getContactDetails.called);
        assert.deepEqual(Utils.getContactDetails.args[0][0], tel);
        assert.ok(Utils.getDisplayObject.called);
        assert.deepEqual(Utils.getDisplayObject.args[0][1], tel);
        done();
      }
    );
  });

  test('Empty contact with phonenumber', function(done) {
    this.sinon.stub(MockContact, 'list', function() {
      return [];
    });
    Utils.getContactDisplayInfo(
      MockContacts.findByPhoneNumber.bind(MockContacts),
      '+348888888888',
      function onData(data) {
        var tel = {
          'value': '+348888888888',
          'type': [''],
          'carrier': ''
        };
        assert.ok(Utils.getContactDetails.called);
        assert.deepEqual(Utils.getContactDetails.args[0][0], tel);
        assert.ok(Utils.getDisplayObject.called);
        assert.deepEqual(Utils.getDisplayObject.args[0][1], tel);
        done();
      }
    );
  });

  test('Null contact with phonenumber', function(done) {
    this.sinon.stub(MockContact, 'list', function() {
      return null;
    });
    Utils.getContactDisplayInfo(
      MockContacts.findByPhoneNumber.bind(MockContacts),
      '+348888888888',
      function onData(data) {
        var tel = {
          'value': '+348888888888',
          'type': [''],
          'carrier': ''
        };
        assert.ok(Utils.getContactDetails.called);
        assert.deepEqual(Utils.getContactDetails.args[0][0], tel);
        assert.ok(Utils.getDisplayObject.called);
        assert.deepEqual(Utils.getDisplayObject.args[0][1], tel);
        done();
      }
    );
  });

  test('No contact and no phonenumber', function(done) {
    this.sinon.stub(MockContact, 'list', function() {
      return [];
    });
    Utils.getContactDisplayInfo(
      MockContacts.findByPhoneNumber.bind(MockContacts),
      '',
      function onData(data) {
        assert.isFalse(Utils.getContactDetails.called);
        assert.isFalse(Utils.getDisplayObject.called);
        assert.equal(data, null);
        done();
      }
    );
  });
});
