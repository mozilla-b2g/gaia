/*global MockL10n, Utils, MockContact, FixturePhones, MockContactPhotoHelper,
         MockContacts, MockMozPhoneNumberService, MocksHelper, Notification,
         MockNotification, Threads, Promise */

'use strict';

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_navigator_mozphonenumberservice.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
requireApp('sms/js/utils.js');
requireApp('sms/shared/test/unit/mocks/mock_notification.js');
requireApp('sms/test/unit/mock_threads.js');

var MocksHelperForUtilsUnitTest = new MocksHelper([
  'ContactPhotoHelper',
  'Notification',
  'Threads'
]).init();


suite('Utils', function() {
  MocksHelperForUtilsUnitTest.attachTestHelpers();

  var nativeMozL10n = navigator.mozL10n;
  var nmpns = navigator.mozPhoneNumberService;

  suiteSetup(function() {
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  setup(function() {
    // Override generic mozL10n.get for this test
    this.sinon.stub(navigator.mozL10n, 'get',
      function get(key, params) {
        if (params) {
          return key + JSON.stringify(params);
        }
        return key;
    });
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
        org: ''
      });

      details = Utils.getContactDetails('12125559999', contact);
      assert.deepEqual(details, {
        isContact: true,
        title: 'Pepito O\'Hare',
        name: 'Pepito O\'Hare',
        org: ''
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
        org: ''
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
        org: ''
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
        org: ''
      });

    });

    test('(number, contact, { photoURL: true })', function() {
      var contact = new MockContact();
      var blob = new Blob(['foo'], { type: 'text/plain' });
      this.sinon.stub(MockContactPhotoHelper, 'getThumbnail').returns(blob);

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
          org: ''
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
          org: ''
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
          org: ''
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
          org: ''
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
          org: ''
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
          org: 'TEF'
        });
      });
    });
  });

  suite('Utils.getPhoneDetails', function() {
    /**
     * Based on input number tries to extract more phone details like phone
     * type, full phone number and phone carrier.
     * 1. If a phone number has carrier associated with it then both "type" and
     * "carrier" will be returned;
     *
     * 2. If there is no carrier associated with the phone number then "type"
     *  and "phone number" will be returned;
     *
     * 3. If for some reason a single contact has two phone numbers with the
     * same type and the same carrier then "type" and "phone number" will be
     * returned;
    */
    test('Single with carrier', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '101', type: ['Mobile'], carrier: 'Nynex'}
      ];

      var a = Utils.getPhoneDetails('101', tel);

      assert.deepEqual(a, {
        type: tel[0].type[0],
        carrier: tel[0].carrier,
        number: tel[0].value
      });
    });

    test('Single no carrier', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '201', type: ['Mobile'], carrier: null}
      ];

      var a = Utils.getPhoneDetails('201', tel);

      assert.deepEqual(a, {
        type: tel[0].type[0],
        carrier: null,
        number: tel[0].value
      });
    });

    test('No carrier, no type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '201', type: [], carrier: null}
      ];

      var a = Utils.getPhoneDetails('201', tel);

      assert.deepEqual(a, {
        type: null,
        carrier: null,
        number: tel[0].value
      });
    });

    test('Multi different carrier & type, match both', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '301', type: ['Mobile'], carrier: 'Nynex'},
        {value: '302', type: ['Home'], carrier: 'MCI'}
      ];

      var a = Utils.getPhoneDetails('301', tel);
      var b = Utils.getPhoneDetails('302', tel);

      assert.deepEqual(a, {
        type: tel[0].type[0],
        carrier: tel[0].carrier,
        number: tel[0].value
      });
      assert.deepEqual(b, {
        type: tel[1].type[0],
        carrier: tel[1].carrier,
        number: tel[1].value
      });
    });

    test('Multi different carrier, match first', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '401', type: ['Mobile'], carrier: 'Nynex'},
        {value: '402', type: ['Home'], carrier: 'MCI'}
      ];

      var a = Utils.getPhoneDetails('401', tel);

      assert.deepEqual(a, {
        type: tel[0].type[0],
        carrier: tel[0].carrier,
        number: tel[0].value
      });
    });

    test('Multi different carrier, match second', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '501', type: ['Mobile'], carrier: 'Nynex'},
        {value: '502', type: ['Home'], carrier: 'MCI'}
      ];

      var a = Utils.getPhoneDetails('502', tel);

      assert.deepEqual(a, {
        type: tel[1].type[0],
        carrier: tel[1].carrier,
        number: tel[1].value
      });
    });

    test('Multi same carrier & type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '601', type: ['Mobile'], carrier: 'Nynex'},
        {value: '602', type: ['Mobile'], carrier: 'Nynex'}
      ];

      var a = Utils.getPhoneDetails('601', tel);
      var b = Utils.getPhoneDetails('602', tel);

      assert.deepEqual(a, {
        type: tel[0].type[0],
        carrier: null,
        number: tel[0].value
      });
      assert.deepEqual(b, {
        type: tel[1].type[0],
        carrier: null,
        number: tel[1].value
      });
    });

    test('Multi same carrier, different type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '701', type: ['Mobile'], carrier: 'Nynex'},
        {value: '702', type: ['Home'], carrier: 'Nynex'}
      ];

      var a = Utils.getPhoneDetails('701', tel);
      var b = Utils.getPhoneDetails('702', tel);

      assert.deepEqual(a, {
        type: tel[0].type[0],
        carrier: tel[0].carrier,
        number: tel[0].value
      });
      assert.deepEqual(b, {
        type: tel[1].type[0],
        carrier: tel[1].carrier,
        number: tel[1].value
      });
    });

    test('Multi different carrier, same type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '801', type: ['Mobile'], carrier: 'Nynex'},
        {value: '802', type: ['Mobile'], carrier: 'MCI'}
      ];

      var a = Utils.getPhoneDetails('801', tel);
      var b = Utils.getPhoneDetails('802', tel);

      assert.deepEqual(a, {
        type: tel[0].type[0],
        carrier: tel[0].carrier,
        number: tel[0].value
      });
      assert.deepEqual(b, {
        type: tel[1].type[0],
        carrier: tel[1].carrier,
        number: tel[1].value
      });
    });

    test('Multi different carrier, same type - intl number', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '1234567890', type: ['Mobile'], carrier: 'Nynex'},
        {value: '0987654321', type: ['Mobile'], carrier: 'MCI'}
      ];

      var a = Utils.getPhoneDetails('+1234567890', tel);
      var b = Utils.getPhoneDetails('+0987654321', tel);

      assert.deepEqual(a, {
        type: tel[0].type[0],
        carrier: tel[0].carrier,
        number: tel[0].value
      });
      assert.deepEqual(b, {
        type: tel[1].type[0],
        carrier: tel[1].carrier,
        number: tel[1].value
      });
    });

    test('Multi different carrier, same type - never match', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '1234567890', type: ['Mobile'], carrier: 'Nynex'},
        {value: '0987654321', type: ['Mobile'], carrier: 'MCI'}
      ];

      var a = Utils.getPhoneDetails('+9999999999', tel);
      var b = Utils.getPhoneDetails('+9999999999', tel);

      assert.isNull(a);
      assert.isNull(b);
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

    this.timeout(5000);

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

    setup(function() {
      this.sinon.spy(window.URL, 'createObjectURL');
      this.sinon.spy(window.URL, 'revokeObjectURL');
    });

    function assertCreatedBlobUrlsAreRevoked() {
      var createdObjectURLs = window.URL.createObjectURL.returnValues;
      var revokedObjectURLs = window.URL.revokeObjectURL.args.map(
        (args) => args[0]
      );

      assert.deepEqual(
        createdObjectURLs, revokedObjectURLs,
        'All created Blob URLs are revoked'
      );
    }

    Object.keys(typeTestData).forEach(function(filename) {
      test(filename, function(done) {
        var blob = typeTestData[filename];
        // half the image size, or 100k, whichever is smaller
        var limit = Math.min(100000, (blob.size / 2));

        Utils.getResizedImgBlob(blob, limit, function(resizedBlob) {
          done(function() {
            assert.isTrue(resizedBlob.size < limit,
              'resizedBlob is smaller than ' + limit);

            assertCreatedBlobUrlsAreRevoked();
          });
        });
      });
    });

    test('Image size is smaller than limit', function(done) {
      var blob = qualityTestData['low_quality.jpg'];
      var limit = blob.size * 2;
      this.sinon.spy(Utils, '_resizeImageBlobWithRatio');

      Utils.getResizedImgBlob(blob, limit, function(resizedBlob) {
        done(function() {
          assert.equal(resizedBlob, blob,
            'resizedBlob and blob should be the same');
          sinon.assert.notCalled(Utils._resizeImageBlobWithRatio);
          assertCreatedBlobUrlsAreRevoked();
        });
      });
    });

    test('Resize low quality image', function(done) {
      var blob = qualityTestData['low_quality.jpg'];
      var resizedBlob = qualityTestData['low_quality_resized.jpg'];
      var defaultBlob = qualityTestData['default_quality_resized.jpg'];
      var limit = blob.size / 2;

      var toBlobStub = this.sinon.stub(HTMLCanvasElement.prototype,
        'toBlob', function(callback, type, quality) {
          if (quality) {
            callback(resizedBlob);
          } else {
            callback(defaultBlob);
          }
      });

      Utils.getResizedImgBlob(blob, limit, function(result) {
        done(function() {
          assert.isTrue(
            result.size < limit,
            'result blob is smaller than ' + limit
          );

          sinon.assert.calledTwice(toBlobStub);

          assert.equal(toBlobStub.args[0][2], undefined);
          assert.equal(toBlobStub.args[1][2], 0.65);
          assertCreatedBlobUrlsAreRevoked();
        });
      });
    });

    test('Decrease image quality not working', function(done) {
      var blob = qualityTestData['low_quality.jpg'];
      var resizedBlob = qualityTestData['low_quality_resized.jpg'];
      var defaultBlob = qualityTestData['default_quality_resized.jpg'];
      var limit = blob.size / 2;

      var resizeSpy = this.sinon.spy(Utils, '_resizeImageBlobWithRatio');

      this.sinon.stub(
        HTMLCanvasElement.prototype, 'toBlob',
        function(callback, type, quality) {
          if (resizeSpy.callCount == 2) {
            // return the resizedBlob only when we're trying with an higher
            // ratio, so that we can test the whole process
            callback(resizedBlob);
          } else {
            callback(defaultBlob);
          }
        }
      );

      Utils.getResizedImgBlob(blob, limit, function(resizedBlob) {
        done(function() {
          assert.isTrue(resizedBlob.size < limit,
            'resizedBlob is smaller than ' + limit);
          var toBlobSpy = HTMLCanvasElement.prototype.toBlob;

          // Image quality testing should go down 3 quality level first
          // than force the image rescale to smaller size.
          assert.equal(toBlobSpy.callCount, 5);
          assert.equal(toBlobSpy.args[0][2], undefined);
          assert.equal(toBlobSpy.args[1][2], 0.65);
          assert.equal(toBlobSpy.args[2][2], 0.5);
          assert.equal(toBlobSpy.args[3][2], 0.25);
          assert.equal(toBlobSpy.args[4][2], undefined);

          // Verify getResizedImgBlob is called twice and resize ratio
          // parameter is changed in the second call
          sinon.assert.calledTwice(Utils._resizeImageBlobWithRatio);
          assert.ok(resizeSpy.firstCall.args[0].ratio <
            resizeSpy.lastCall.args[0].ratio);
          assertCreatedBlobUrlsAreRevoked();
        });
      });
    });
  });

  suite('Utils.getDownsamplingSrcUrl', function() {
    var testOptions;

    setup(function() {
      testOptions = {
        url: 'test url',
        size: 300 * 1024,
        type: 'thumbnail'
      };
    });
    test('no size information', function() {
      testOptions = {
        url: 'test url',
        type: 'thumbnail'
      };
      assert.equal(Utils.getDownsamplingSrcUrl(testOptions), testOptions.url);
    });
    test('no downsampling reference type ', function() {
      testOptions = {
        url: 'test url',
        size: 300 * 1024
      };
      assert.equal(Utils.getDownsamplingSrcUrl(testOptions), testOptions.url);
    });
    test('No need to add -moz-samplesize postfix when ratio < 2', function() {
      testOptions = {
        url: 'test url',
        size: 1,
        type: 'thumbnail'
      };
      assert.equal(Utils.getDownsamplingSrcUrl(testOptions), testOptions.url);
    });
    test('Add -moz-samplesize postfix with ratio when ratio >= 2', function() {
      testOptions = {
        url: 'test url',
        size: 300 * 1024,
        type: 'thumbnail'
      };
      var result =
        Utils.getDownsamplingSrcUrl(testOptions).split('#-moz-samplesize=');
      assert.equal(testOptions.url, result[0]);
      assert.isTrue(+result[1] > 0 && Number.isInteger(+result[1]));
    });
    test('Maximum samplesize ratio reached', function() {
      testOptions = {
        url: 'test url',
        size: Number.MAX_VALUE,
        type: 'thumbnail'
      };
      assert.equal(Utils.getDownsamplingSrcUrl(testOptions),
        testOptions.url + '#-moz-samplesize=16');
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

  suite('Utils.closeNotificationsForThread', function() {
    var closeStub;

    setup(function() {
      this.sinon.stub(Notification, 'get').returns(Promise.resolve([]));
      this.sinon.spy(console, 'error');
      closeStub = this.sinon.stub(MockNotification.prototype, 'close');
    });

    test('notification matched with no threadId given(current Id)',
    function(done) {
      Threads.currentId = 'currentId';
      Utils.closeNotificationsForThread().then(function() {
        sinon.assert.calledWith(Notification.get,
          {tag : 'threadId:' + Threads.currentId});
      }).then(done, done);
    });

    test('notification matched with specific threadId', function(done) {
      Utils.closeNotificationsForThread('targetId').then(function() {
        sinon.assert.calledWith(Notification.get, {tag : 'threadId:targetId'});
      }).then(done, done);
    });

    test('notification matched', function(done) {
      var notification = new Notification('test', {});
      Notification.get.returns(Promise.resolve([notification]));
      Utils.closeNotificationsForThread('matched').then(function() {
        sinon.assert.called(closeStub);
      }).then(done, done);
    });

    test('no notification matched', function(done) {
      Notification.get.returns(Promise.resolve([]));
      Utils.closeNotificationsForThread('not-matched').then(function() {
        sinon.assert.notCalled(closeStub);
      }).then(done, done);
    });

    test('Get Notification error', function(done) {
      var errorMessage = 'error callback test';

      Notification.get.returns(Promise.reject(errorMessage));

      Utils.closeNotificationsForThread('broken').then(function() {
        sinon.assert.notCalled(closeStub);
        sinon.assert.calledWith(
          console.error,
          'Notification.get(tag: threadId:broken): ', errorMessage
        );
      }).then(done, done);
    });

    test('closing notification error', function(done) {
      closeStub.throws('GenericError');
      var notification = new Notification('test', {});
      Notification.get.returns(Promise.resolve([notification]));
      Utils.closeNotificationsForThread('closeError').then(function() {
        sinon.assert.called(closeStub);
        sinon.assert.calledWith(
          console.error,
          'Notification.get(tag: threadId:closeError): '
        );
      }).then(done, done);
    });
  });

  suite('Utils.imageToCanvas', function() {
    setup(function() {
      this.sinon.stub(CanvasRenderingContext2D.prototype, 'drawImage');
    });

    test('correct ratio is used', function() {
      var imgNode = document.createElement('img'),
          targetWidth = 100,
          targetHeight = 200,
          heightRatio = 2,
          widthRatio = 3;

      imgNode.width = targetWidth * widthRatio;
      imgNode.height = targetHeight * heightRatio;

      var canvas = Utils.imageToCanvas(imgNode, targetWidth, targetHeight);

      assert.equal(canvas.width, Math.round(imgNode.width / widthRatio));
      assert.equal(canvas.height, Math.round(imgNode.height / widthRatio));

      heightRatio = 3;
      widthRatio = 2;

      imgNode.width = targetWidth * widthRatio;
      imgNode.height = targetHeight * heightRatio;

      canvas = Utils.imageToCanvas(imgNode, targetWidth, targetHeight);

      assert.equal(canvas.width, Math.round(imgNode.width / heightRatio));
      assert.equal(canvas.height, Math.round(imgNode.height / heightRatio));
    });

    test('canvas is drawn with right dimensions', function() {
      var imgNode = document.createElement('img'),
          targetWidth = 100,
          targetHeight = 200,
          ratio = 2;

      imgNode.width = targetWidth * ratio;
      imgNode.height = targetHeight * ratio;

      var canvas = Utils.imageToCanvas(imgNode, targetWidth, targetHeight);

      assert.equal(canvas.width, Math.round(imgNode.width / ratio));
      assert.equal(canvas.height, Math.round(imgNode.height / ratio));
      sinon.assert.calledWith(
        CanvasRenderingContext2D.prototype.drawImage,
        imgNode, 0, 0, canvas.width, canvas.height
      );
    });
  });

  suite('Utils.imageUrlToDataUrl', function() {
     var getCustomImageDataURL = function(width, height, type) {
      var canvas = document.createElement('canvas'),
          context = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;

      context.fillStyle = 'rgb(255, 0, 0)';
      context.fillRect (0, 0, width, height);

      return canvas.toDataURL(type);
    };

    test('generates the same image if size is not adjusted', function(done) {
      var type = 'image/jpeg',
          actualWidth = 100,
          actualHeight = 200,
          imageURL = getCustomImageDataURL(actualWidth, actualHeight, type);

      Utils.imageUrlToDataUrl(imageURL, type).then((result) => {
        assert.deepEqual(result, {
          dataUrl: imageURL,
          width: actualWidth,
          height: actualHeight
        });
      }).then(done, done);
    });

    test('generates image with the adjusted size', function(done) {
      var type = 'image/png',
          actualWidth = 100,
          actualHeight = 200,
          scaleFactor = 2,
          imageURL = getCustomImageDataURL(actualWidth, actualHeight, type);

      Utils.imageUrlToDataUrl(imageURL, type, (width, height) => {
        return {
          width: width * scaleFactor,
          height: height * scaleFactor
        };
      }).then((result) => {
        assert.equal(result.dataUrl.indexOf('data:' + type), 0);
        assert.equal(result.width, actualWidth * scaleFactor);
        assert.equal(result.height, actualHeight * scaleFactor);
      }).then(done, done);
    });

    test('rejects in case of invalid image URL', function(done) {
      var invalidImageURL = 'null';

      Utils.imageUrlToDataUrl(invalidImageURL, 'image/png').then(() => {
        return Promise.reject(new Error('Success callback is not expected!'));
      }, (e) => {
        assert.ok(e);
      }).then(done, done);
    });

    test('rejects in case of sizeAdjuster fails', function(done) {
      var type = 'image/png',
          actualWidth = 100,
          actualHeight = 200,
          imageURL = getCustomImageDataURL(actualWidth, actualHeight, type);

      Utils.imageUrlToDataUrl(imageURL, type, () => {
        throw new Error('Something went wrong!');
      }).then(
        () => Promise.reject(new Error('Success callback is not expected!')),
        (e) => {
          assert.ok(e);
        }
      ).then(done, done);
    });
  });

  suite('Utils.Promise', function() {
    suite('defer()', function() {
      test('deferred object structure', function() {
        var deferred = Utils.Promise.defer();

        assert.isNotNull(deferred);
        assert.isTrue(deferred.promise instanceof Promise);
        assert.isTrue(typeof deferred.resolve == 'function');
        assert.isTrue(typeof deferred.reject == 'function');
      });

      test('resolved promise', function(done) {
        var deferred = Utils.Promise.defer(),
            resolveResult = {
              message: 'Yay!'
            };

        deferred.promise.then(
          (result) => {
            assert.equal(resolveResult, result);
          },
          () => Promise.reject(new Error('Fail callback is not expected!'))
        ).then(done, done);

        deferred.resolve(resolveResult);
      });

      test('rejected promise', function(done) {
        var deferred = Utils.Promise.defer(),
            rejectResult = new Error('Nooo!');

        deferred.promise.then(
          () => Promise.reject(new Error('Success callback is not expected!')),
          (result) => {
            assert.equal(rejectResult, result);
          }).then(done, done);

        deferred.reject(rejectResult);
      });
    });
  });
});

suite('getDisplayObject', function() {
  var nativeMozL10n = navigator.mozL10n;
  setup(function() {
    navigator.mozL10n = MockL10n;
    // Override generic mozL10n.get for this test
    this.sinon.stub(navigator.mozL10n, 'get',
      function get(key, params) {
        if (params) {
          return key + JSON.stringify(params);
        }
        return key;
    });
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
    assert.equal(data.type, type);
    assert.equal(data.carrier, carrier);
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
    assert.equal(data.type, type);
    assert.equal(data.carrier, carrier);
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

test('getClosestSampleSize', function() {
  assert.equal(Utils.getClosestSampleSize(1), 1);
  assert.equal(Utils.getClosestSampleSize(2), 2);
  assert.equal(Utils.getClosestSampleSize(3), 2);
  assert.equal(Utils.getClosestSampleSize(4), 4);
  assert.equal(Utils.getClosestSampleSize(5), 4);
  assert.equal(Utils.getClosestSampleSize(5.5), 4);
  assert.equal(Utils.getClosestSampleSize(6), 4);
  assert.equal(Utils.getClosestSampleSize(7), 4);
  assert.equal(Utils.getClosestSampleSize(8), 8);
  assert.equal(Utils.getClosestSampleSize(9), 8);
});

test('extend()', function() {
  var source = {
    prop1: 'prop1-source',
    prop2: 'prop2-source'
  };

  var target = {
    prop2: 'prop2-target',
    prop3: 'prop3-target'
  };

  var prototype = {
    prop4: 'prop4-proto'
  };

  target.prototype = Object.create(prototype);

  Utils.extend(target, source);

  assert.equal(
    target.prop1, source.prop1,
    'copies over properties'
  );

  assert.equal(
    target.prop2, source.prop2,
    'overrides properties'
  );

  assert.equal(
    target.prop3, 'prop3-target',
    'does not change properties that is not in target'
  );

  assert.isUndefined(
    target.prop4,
    'does not copy over properties from prototype'
  );
});

