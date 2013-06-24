'use strict';

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/js/utils.js');

suite('Utils', function() {
  var nativeMozL10n = navigator.mozL10n;

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


  suite('Utils.escapeHTML', function() {

    test('valid', function() {
      var fixture = '<div>"Hello!"&  \' </div>';

      assert.equal(
        Utils.escapeHTML(fixture),
        '&lt;div&gt;&quot;Hello!&quot;&amp;  &apos; &lt;/div&gt;'
      );
    });

    test('invalid', function() {
      var expect = '';

      assert.equal(Utils.escapeHTML(0), expect);
      assert.equal(Utils.escapeHTML(false), expect);
      assert.equal(Utils.escapeHTML(true), expect);
      assert.equal(Utils.escapeHTML(null), expect);
      assert.equal(Utils.escapeHTML({}), expect);
      assert.equal(Utils.escapeHTML([]), expect);
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
      var contact = new MockContact();

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
      var name = contact.name[0];

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
        var name = contacts[0].name[0];
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
        var name = contact.name[0];

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

  suite('Utils.getContactCarrier', function() {

    test('Single with carrier', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '101', type: ['Mobile'], carrier: 'Nynex'}
      ];

      var a = Utils.getContactCarrier('101', tel);

      assert.equal(a, 'Mobile | Nynex');
    });

    test('Single no carrier', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '201', type: ['Mobile'], carrier: null}
      ];

      var a = Utils.getContactCarrier('201', tel);

      assert.equal(a, 'Mobile | 201');
    });

    test('Multi different carrier & type, match both', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '301', type: ['Mobile'], carrier: 'Nynex'},
        {value: '302', type: ['Home'], carrier: 'MCI'}
      ];

      var a = Utils.getContactCarrier('301', tel);
      var b = Utils.getContactCarrier('302', tel);

      assert.equal(a, 'Mobile | Nynex');
      assert.equal(b, 'Home | MCI');
    });

    test('Multi different carrier, match first', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '401', type: ['Mobile'], carrier: 'Nynex'},
        {value: '402', type: ['Home'], carrier: 'MCI'}
      ];

      var a = Utils.getContactCarrier('401', tel);

      assert.equal(a, 'Mobile | Nynex');
    });

    test('Multi different carrier, match second', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '501', type: ['Mobile'], carrier: 'Nynex'},
        {value: '502', type: ['Home'], carrier: 'MCI'}
      ];

      var a = Utils.getContactCarrier('502', tel);

      assert.equal(a, 'Home | MCI');
    });

    test('Multi same carrier & type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '601', type: ['Mobile'], carrier: 'Nynex'},
        {value: '602', type: ['Mobile'], carrier: 'Nynex'}
      ];

      var a = Utils.getContactCarrier('601', tel);
      var b = Utils.getContactCarrier('602', tel);

      assert.equal(a, 'Mobile | 601');
      assert.equal(b, 'Mobile | 602');
    });

    test('Multi same carrier, different type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '701', type: ['Mobile'], carrier: 'Nynex'},
        {value: '702', type: ['Home'], carrier: 'Nynex'}
      ];

      var a = Utils.getContactCarrier('701', tel);
      var b = Utils.getContactCarrier('702', tel);

      assert.equal(a, 'Mobile | Nynex');
      assert.equal(b, 'Home | Nynex');
    });

    test('Multi different carrier, same type', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '801', type: ['Mobile'], carrier: 'Nynex'},
        {value: '802', type: ['Mobile'], carrier: 'MCI'}
      ];

      var a = Utils.getContactCarrier('801', tel);
      var b = Utils.getContactCarrier('802', tel);

      assert.equal(a, 'Mobile | Nynex');
      assert.equal(b, 'Mobile | MCI');
    });

    test('Multi different carrier, same type - intl number', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '1234567890', type: ['Mobile'], carrier: 'Nynex'},
        {value: '0987654321', type: ['Mobile'], carrier: 'MCI'}
      ];

      var a = Utils.getContactCarrier('+1234567890', tel);
      var b = Utils.getContactCarrier('+0987654321', tel);

      assert.equal(a, 'Mobile | Nynex');
      assert.equal(b, 'Mobile | MCI');
    });

    test('Multi different carrier, same type - never match', function() {
      // ie. contact.tel [ ... ]
      var tel = [
        {value: '1234567890', type: ['Mobile'], carrier: 'Nynex'},
        {value: '0987654321', type: ['Mobile'], carrier: 'MCI'}
      ];

      var a = Utils.getContactCarrier('+9999999999', tel);
      var b = Utils.getContactCarrier('+9999999999', tel);

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

  suite('Utils.compareDialables(a, b)', function() {
    test('spaces', function() {
      assert.ok(
        Utils.compareDialables('888 999 5555', '8889995555')
      );
    });

    test('non-digit, common chars', function() {
      assert.ok(
        Utils.compareDialables('(1A)2B 3C', '123')
      );
    });

    suite('Varied Cases', function() {
      // Derived from
      // /dom/phonenumberutils/tests/test_phonenumber.xul

      [
        {
          name: 'US',
          values: [
            '9995551234', '+19995551234', '(999) 555-1234',
            '1 (999) 555-1234', '+1 (999) 555-1234', '+1 999-555-1234'
          ]
        },
        {
          name: 'DE',
          values: [
            '01149451491934', '49451491934', '451491934',
            '0451 491934', '+49 451 491934', '+49451491934'
          ]
        },
        {
          name: 'IT',
          values: [
            '0577-555-555', '0577555555', '05 7755 5555', '+39 05 7755 5555'
          ]
        },
        {
          name: 'ES',
          values: [
            '612123123', '612 12 31 23', '+34 612 12 31 23'
          ]
        },
        {
          name: 'BR',
          values: [
            '01187654321', '0411187654321', '551187654321',
            '90411187654321', '+551187654321'
          ]
        },
        {
          name: 'CL',
          values: [
            '0997654321', '997654321', '(99) 765 4321', '+56 99 765 4321'
          ]
        },
        {
          name: 'CO',
          values: [
            '5712234567', '12234567', '(1) 2234567', '+57 1 2234567'
          ]
        },
        {
          name: 'FR',
          values: [
            '0123456789', '+33123456789', '0033123456789',
            '01.23.45.67.89', '01 23 45 67 89', '01-23-45-67-89',
            '+33 1 23 45 67 89'
          ]
        }
      ].forEach(function(fixture) {

        suite(fixture.name, function() {
          var values = fixture.values;

          values.forEach(function(value) {
            values.forEach(function(versus) {
              test(value + ' likely same as ' + versus, function() {
                assert.ok(Utils.compareDialables(value, versus));
              });
            });
          });
        });
      });
    });
  });


  suite('Utils for MMS user story test', function() {
    test('Image rescaling to 300kB', function(done) {
      // Open test image for testing image resize ability
      function resizeTest(name) {
        var req = new XMLHttpRequest();
        req.open('GET' , '/test/unit/media/' + name, true);
        req.responseType = 'blob';

        req.onreadystatechange = function() {
          if (req.readyState === 4 && req.status === 200) {
            var blob = req.response;
            var limit = 300 * 1024;
            Utils.getResizedImgBlob(blob, limit, function(resizedBlob) {
              assert.isTrue(resizedBlob.size < limit);
              done();
            });
          }
        };
        req.send(null);
      }
      resizeTest('IMG_0554.jpg');
    });
  });

  suite('Utils.typeFromMimeType', function() {
    var testIndex;
    var tests = {
      'text/plain': 'text',
      'image/jpeg': 'img',
      'video/ogg': 'video',
      'audio/ogg': 'audio',
      'not-a-mime': null,
      'text': null,
      'appplication/video': null
    };

    for (testIndex in tests) {
      test(testIndex, function() {
        assert.equal(Utils.typeFromMimeType(testIndex), tests[testIndex]);
      });
    }

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
    var testIndex;
    var tests = {
      '?foo=bar&baz=1&quux=null': {foo: 'bar', baz: '1', quux: 'null'}
    };

    for (testIndex in tests) {
      test(testIndex, function() {
        assert.deepEqual(Utils.params(testIndex), tests[testIndex]);
      });
    }
  });

});

suite('Utils.Template', function() {

  suite('extracted template strings', function() {

    var domElement;
    suiteSetup(function() {
      domElement = document.createElement('div');
      domElement.id = 'existing-id';
      domElement.appendChild(document.createComment('testing'));
      document.body.appendChild(domElement);
    });

    suiteTeardown(function() {
      if (domElement && domElement.parentNode) {
        document.body.removeChild(domElement);
        domElement = null;
      }
    });

    test('extract(node)', function() {
      var node = document.createElement('div');
      var comment = document.createComment('<span>${str}</span>');

      node.appendChild(document.createTextNode('  '));
      node.appendChild(comment);

      assert.equal(
        Utils.Template(node).toString(), '<span>${str}</span>'
      );

      node.textContent = '';
      assert.equal(
        Utils.Template(node).toString(), ''
      );
    });

    test('extract(null)', function() {
      assert.equal(Utils.Template(null), '');
    });

    test('extract(non-element)', function() {
      assert.equal(Utils.Template(document), '');
      assert.equal(Utils.Template(window), '');
      assert.equal(Utils.Template(document.createComment('')), '');
    });

    test('extract("non-existing-id")', function() {
      assert.equal(Utils.Template('non-existing-id'), '');
    });

    test('extract("existing-id")', function() {
      assert.equal(Utils.Template('existing-id').toString(), 'testing');
    });
  });

  suite('interpolate', function() {
    var node = document.createElement('div');
    node.appendChild(document.createComment('<span>${str}</span>'));

    test('interpolate(data)', function() {
      var tmpl = Utils.Template(node);
      var interpolated = tmpl.interpolate({
        str: 'test'
      });
      assert.equal(typeof interpolated, 'string');
      assert.equal(interpolated, '<span>test</span>');
    });
  });

  suite('interpolate: escape', function() {
    var node = document.createElement('div');
    node.appendChild(document.createComment('${str}'));

    test('escape: & => &amp;', function() {
      var tmpl = Utils.Template(node);
      var interpolated = tmpl.interpolate({
        str: '&'
      });
      assert.equal(interpolated, '&amp;');
    });

    test('escape: < => &lt;', function() {
      var tmpl = Utils.Template(node);
      var interpolated = tmpl.interpolate({
        str: '<'
      });
      assert.equal(interpolated, '&lt;');
    });

    test('escape: > => &gt;', function() {
      var tmpl = Utils.Template(node);
      var interpolated = tmpl.interpolate({
        str: '>'
      });
      assert.equal(interpolated, '&gt;');
    });
  });

  suite('interpolate: sanitize', function() {
    test('HTML removal with escaping', function() {
      var node, interpolated;

      node = document.createElement('div');
      node.appendChild(document.createComment('${str}'));

      interpolated = Utils.Template(node).interpolate({
        str: '<textarea><p>George & Lenny</p>'
      });
      assert.equal(
        interpolated,
        '&lt;textarea&gt;&lt;p&gt;George &amp; Lenny&lt;/p&gt;'
      );

      node = document.createElement('div');
      node.appendChild(document.createComment('<p>${str}</p>'));

      interpolated = Utils.Template(node).interpolate({
        str: '<textarea><div>George & Lenny</div>'
      });
      assert.equal(
        interpolated,
        '<p>&lt;textarea&gt;&lt;div&gt;George &amp; Lenny&lt;/div&gt;</p>'
      );
    });

    test('HTML removal (script)', function() {
      var node = document.createElement('div');
      node.appendChild(document.createComment('${str}'));

      var interpolated = Utils.Template(node).interpolate({
        str: '<script>alert("hi!")' + '</script>'
      });
      assert.equal(
        interpolated,
        '&lt;script&gt;alert(&quot;hi!&quot;)&lt;/script&gt;'
      );
    });

    test('HTML removal (any)', function() {
      var node = document.createElement('div');
      node.appendChild(document.createComment('${str}'));

      var interpolated = Utils.Template(node).interpolate({
        str: '<textarea><div>hi!</div>'
      });
      assert.equal(
        interpolated,
        '&lt;textarea&gt;&lt;div&gt;hi!&lt;/div&gt;'
      );
    });

    test('HTML safe list', function() {
      var node = document.createElement('div');
      node.appendChild(document.createComment('${foo}${bar}'));

      var interpolated = Utils.Template(node).interpolate({
        foo: '<script>alert("hi!")' + '</script>',
        bar: '<p>this is ok</p>'
      }, { safe: ['bar'] });
      assert.equal(
        interpolated,
        '&lt;script&gt;alert(&quot;hi!&quot;)&lt;/script&gt;<p>this is ok</p>'
      );
    });
  });
});
