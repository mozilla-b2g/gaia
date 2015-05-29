/*global MockL10n, Utils, MockContact, FixturePhones, MockContactPhotoHelper,
         MockMozPhoneNumberService, MocksHelper, Notification,
         MockNotification, Threads, Promise, MockSettings,
         AssetsHelper,
         Dialog
*/

'use strict';

require('/views/shared/test/unit/mock_contact.js');
require('/views/shared/test/unit/mock_contacts.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/views/shared/test/unit/mock_navigator_mozphonenumberservice.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/views/shared/js/utils.js');
requireApp('sms/shared/test/unit/mocks/mock_notification.js');
require('/services/test/unit/mock_threads.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_dialog.js');

var MocksHelperForUtilsUnitTest = new MocksHelper([
  'ContactPhotoHelper',
  'Notification',
  'Threads',
  'Settings',
  'Dialog'
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

  suite('Utils.getFormattedHour', function() {
    var time = 1362166084256;

    test('([String|Number|Date])', function() {
      [true, false].forEach(function(isMozHour12) {
        navigator.mozHour12 = isMozHour12;

        var expect = Utils.date.format.localeFormat(
          new Date(time),
          isMozHour12 ? 'shortTimeFormat12' : 'shortTimeFormat24'
        );

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
  });

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

  suite('Utils.getSizeForL10n', function() {
    var sizeL10n;
    var size = [150, 2000, 4000000];

    test('attachment size in B', function() {
      sizeL10n = Utils.getSizeForL10n(size[0]);
      assert.equal(sizeL10n.l10nId, 'attachmentSizeB');
      assert.equal(sizeL10n.l10nArgs.n, '150');
    });
    test('attachment size in KB', function() {
      sizeL10n = Utils.getSizeForL10n(size[1]);
      assert.equal(sizeL10n.l10nId, 'attachmentSizeKB');
      assert.equal(sizeL10n.l10nArgs.n, '2.0');
    });
    test('attachment size in MB', function() {
      sizeL10n = Utils.getSizeForL10n(size[2]);
      assert.equal(sizeL10n.l10nId, 'attachmentSizeMB');
      assert.equal(sizeL10n.l10nArgs.n, '3.8');
    });
  });

  suite('Utils.getResizedImgBlob', function() {
    var blobPromises = [],
        typeTestData = new Map(),
        lowQualityJPEGBlob = null,
        lowQualityResizedJPEGBlob = null,
        defaultQualityResizedJPEGBlob = null,
        width = 480,
        height = 800;

    ['bmp', 'gif', 'png', 'jpeg'].forEach((type) => {
      var blobName = width + 'x' + height + ' ' + type.toUpperCase();
      typeTestData.set(blobName, null);

      blobPromises.push(
        AssetsHelper.generateImageBlob(width, height, 'image/' + type).then(
          (blob) => typeTestData.set(blobName, blob)
        )
      );
    });

    blobPromises.push(
      AssetsHelper.generateImageBlob(width, height, 'image/jpeg', 0.25).then(
        (blob) => lowQualityJPEGBlob = blob
      )
    );

    blobPromises.push(
      AssetsHelper.generateImageBlob(
          width / 2, height / 2, 'image/jpeg', 0.25
      ).then((blob) => lowQualityResizedJPEGBlob = blob)
    );

    blobPromises.push(
      AssetsHelper.generateImageBlob(
          width / 2, height / 2, 'image/jpeg', 0.5
      ).then((blob) => defaultQualityResizedJPEGBlob = blob)
    );


    suiteSetup(function(done) {
      Promise.all(blobPromises).then(() => done(), done);
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

    typeTestData.forEach(function(value, key) {
      test(key, function(done) {
        var blob = typeTestData.get(key);
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
      var blob = lowQualityJPEGBlob;
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
      var blob = lowQualityJPEGBlob;
      var resizedBlob = lowQualityResizedJPEGBlob;
      var defaultBlob = defaultQualityResizedJPEGBlob;
      // Limit should be less then size of the blob returned on the first
      // "toBlob" call so that resize routine is repeated.
      var limit = defaultBlob.size - 1;

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
      var blob = lowQualityJPEGBlob;
      var resizedBlob = lowQualityResizedJPEGBlob;
      var defaultBlob = defaultQualityResizedJPEGBlob;
      var limit = defaultBlob.size - 1;

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

  suite('Utils.typeFromMimeType', function() {
    var tests = {
      'text/plain': 'text',
      'image/jpeg': 'img',
      'video/ogg': 'video',
      'audio/ogg': 'audio',
      'not-a-mime': null,
      'text': null,
      'application/video': 'application',
      'multipart/form-data': null,
      'text/vcard': 'vcard',
      'text/calendar': 'ref'
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

  suite('Utils.debounce', function() {
    setup(function() {
      this.sinon.useFakeTimers();
    });

    test('calls function only once it stops being called', function() {
      var waitTime = 1000,
          funcToExecute = sinon.stub(),
          debouncedFuncToExecute = Utils.debounce(funcToExecute, waitTime);

      debouncedFuncToExecute();
      sinon.assert.notCalled(funcToExecute);

      this.sinon.clock.tick(waitTime - 100);
      sinon.assert.notCalled(funcToExecute);

      debouncedFuncToExecute();
      debouncedFuncToExecute();
      debouncedFuncToExecute();

      this.sinon.clock.tick(waitTime - 100);
      sinon.assert.notCalled(funcToExecute);

      this.sinon.clock.tick(100);
      sinon.assert.calledOnce(funcToExecute);

      this.sinon.clock.tick(waitTime);
      sinon.assert.calledOnce(funcToExecute);
    });
  });

  suite('Modal dialogs >', function() {
    var dialogMock;
    setup(function() {
      dialogMock = sinon.createStubInstance(Dialog);
      this.sinon.stub(window, 'Dialog', function() {
        return dialogMock;
      });
    });

    suite('Utils.alert >', function() {
      test('Correctly passes arguments', function() {
        Utils.alert({ raw: 'message' }, { raw: 'title' });

        sinon.assert.calledWith(Dialog, {
          title: { raw: 'title' },
          body: { raw: 'message' },
          options: {
            cancel: {
              text: 'modal-dialog-ok-button',
              method: sinon.match.func
            }
          }
        });
        sinon.assert.called(dialogMock.show);
      });

      test('uses default title if not defined', function() {
        Utils.alert({ raw: 'message' });

        sinon.assert.calledWith(Dialog, {
          title: 'modal-dialog-default-title',
          body: { raw: 'message' },
          options: {
            cancel: {
              text: 'modal-dialog-ok-button',
              method: sinon.match.func
            }
          }
        });
        sinon.assert.called(dialogMock.show);
      });

      test('resolves only once OK button is pressed', function(done) {
        var alertPromise = Utils.alert({ raw: 'message' });
        var callStub = sinon.stub();

        alertPromise.then(callStub);

        Promise.resolve().then(function() {
          // callback should not be called until user closes alert
          sinon.assert.notCalled(callStub);

          Dialog.firstCall.args[0].options.cancel.method();

          return alertPromise;
        }).then(function() {
          sinon.assert.calledOnce(callStub);
        }, function() {
          throw new Error('Reject callback should not be called');
        }).then(done, done);
      });
    });

    suite('Utils.confirm >', function() {
      test('Correctly passes arguments', function() {
        Utils.confirm({ raw: 'message' }, { raw: 'title' });

        sinon.assert.calledWith(Dialog, {
          title: { raw: 'title' },
          body: { raw: 'message' },
          options: {
            cancel: {
              text: 'modal-dialog-cancel-button',
              method: sinon.match.func
            },

            confirm: {
              text: 'modal-dialog-ok-button',
              method: sinon.match.func,
              className: 'recommend'
            }
          }
        });
        sinon.assert.called(dialogMock.show);
      });

      test('uses default title if not defined', function() {
        Utils.confirm({ raw: 'message' });

        sinon.assert.calledWith(Dialog, {
          title: 'modal-dialog-default-title',
          body: { raw: 'message' },
          options: {
            cancel: {
              text: 'modal-dialog-cancel-button',
              method: sinon.match.func
            },

            confirm: {
              text: 'modal-dialog-ok-button',
              method: sinon.match.func,
              className: 'recommend'
            }
          }
        });
        sinon.assert.called(dialogMock.show);
      });

      test('resolves only once OK button is pressed', function(done) {
        var confirmPromise = Utils.confirm({ raw: 'message' });
        var resolveStub = sinon.stub();
        var rejectStub = sinon.stub();

        confirmPromise.then(resolveStub, rejectStub);

        Promise.resolve().then(function() {
          // callback should not be called until user closes alert
          sinon.assert.notCalled(resolveStub);
          sinon.assert.notCalled(rejectStub);

          Dialog.firstCall.args[0].options.confirm.method();

          return confirmPromise;
        }).then(function() {
          sinon.assert.calledOnce(resolveStub);
          sinon.assert.notCalled(rejectStub);
        }, function() {
          throw new Error('Reject callback should not be called');
        }).then(done, done);
      });

      test('rejects only once Cancel button is pressed', function(done) {
        var confirmPromise = Utils.confirm({ raw: 'message' });
        var resolveStub = sinon.stub();
        var rejectStub = sinon.stub();

        confirmPromise.then(resolveStub, rejectStub);

        Promise.resolve().then(function() {
          // callback should not be called until user closes alert
          sinon.assert.notCalled(resolveStub);
          sinon.assert.notCalled(rejectStub);

          Dialog.firstCall.args[0].options.cancel.method();

          return confirmPromise;
        }).then(function() {
          throw new Error('Resolve callback should not be called');
        }, function() {
          sinon.assert.notCalled(resolveStub);
          sinon.assert.calledOnce(rejectStub);
        }).then(done, done);
      });
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

    suite('async()', function() {
      test('passes all arguments to initial generator correctly',
      function(done) {
        var stub = sinon.stub();

        var asyncFunction = Utils.Promise.async(function* (a, b, c) {
          yield new Promise((resolve) => {
            stub(a, b, c);
            resolve();
          });
        });

        asyncFunction('a', 'b', 'c').
          then(() => sinon.assert.calledWith(stub, 'a', 'b', 'c')).
          then(done, done);
      });

      test('resolved only when all yielded promises are resolved',
      function(done) {
        var firstStub = sinon.stub();
        var secondStub = sinon.stub();
        var thirdStub = sinon.stub();

        var asyncFunction = Utils.Promise.async(function* () {
          yield new Promise((resolve) => resolve()).then(firstStub);
          yield new Promise((resolve) => resolve()).then(secondStub);
          thirdStub();
        });

        asyncFunction().
          then(() => sinon.assert.callOrder(firstStub, secondStub, thirdStub)).
          then(done, done);
      });

      test('handles rejected promise correctly', function(done) {
        var firstStub = sinon.stub();
        var secondStub = sinon.stub();
        var thirdStub = sinon.stub();

        var rejectionError = new Error('Rejected!');

        var asyncFunction = Utils.Promise.async(function* () {
          try {
            yield new Promise(() => { throw rejectionError; });
          } catch(e) {
            firstStub(e);
          }
          yield new Promise((resolve) => resolve()).then(secondStub);
          thirdStub();
        });

        asyncFunction().
          then(() => {
            sinon.assert.callOrder(firstStub, secondStub, thirdStub);
            sinon.assert.calledWith(firstStub, rejectionError);
          }).
          then(done, done);
      });

      test('handles non-promise results correctly', function(done) {
        var stub = sinon.stub();
        var asyncFunction = Utils.Promise.async(function* () {
          stub(yield 3);
        });

        asyncFunction().
          then(() => sinon.assert.calledWith(stub, 3)).
          then(done, done);
      });

      test('handles non-promise exceptions correctly', function(done) {
        var exception = new Error('Exception!');

        var asyncFunction = Utils.Promise.async(function* (error) {
          if (error) {
            throw error;
          }
          yield -1;
        });

        asyncFunction(exception).
          then(
            () => { throw new Error('Success callback is not expected!'); },
            (e) => assert.equal(exception, e)
          ).
          then(done, done);
      });
    });
  });
});

suite('getDisplayObject', function() {
  MocksHelperForUtilsUnitTest.attachTestHelpers();

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

  test('Tel object with title, type and value of email', function() {
    MockSettings.supportEmailRecipient = true;
    var type = 'Personal';
    var myTitle = 'My title';
    var value = 'a@b.com';
    var data = Utils.getDisplayObject(myTitle, {
      'value': value,
      'type': [type]
    });

    assert.equal(data.name, myTitle);
    assert.equal(data.type, type);
    assert.equal(data.carrier, '');
    assert.equal(data.number, value);
    assert.equal(data.email, value);
  });

  test('Tel object with title, NO type and value of email', function() {
    MockSettings.supportEmailRecipient = true;
    var myTitle = 'My title';
    var value = 'a@b.com';
    var data = Utils.getDisplayObject(myTitle, {
      'value': value
    });

    assert.equal(data.name, myTitle);
    assert.equal(data.type, '');
    assert.equal(data.carrier, '');
    assert.equal(data.number, value);
    assert.equal(data.email, value);
  });

  test('Tel object with NO title, type and value of email', function() {
    MockSettings.supportEmailRecipient = true;
    var type = 'Personal';
    var value = 'a@b.com';
    var data = Utils.getDisplayObject(null, {
      'value': value,
      'type': [type]
    });

    assert.equal(data.name, value);
    assert.equal(data.type, type);
    assert.equal(data.carrier, '');
    assert.equal(data.number, value);
    assert.equal(data.email, value);
  });
});

suite('isEmailAddress', function() {
  test('check +348888888888', function() {
    assert.isFalse(Utils.isEmailAddress('+348888888888'));
  });
  test('check a@b.com', function() {
    assert.isTrue(Utils.isEmailAddress('a@b.com'));
  });
  test('check @b.com', function() {
    assert.isFalse(Utils.isEmailAddress('@b.com'));
  });
  test('check abcd@', function() {
    assert.isFalse(Utils.isEmailAddress('abcd@'));
  });
  test('check a@a', function() {
    assert.isTrue(Utils.isEmailAddress('a@a'));
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
