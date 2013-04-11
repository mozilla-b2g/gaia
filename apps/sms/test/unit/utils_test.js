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

  suite('Utils.getPhoneDetails', function() {
    test('(number, contact, callback)', function() {
      var contact = new MockContact();

      Utils.getPhoneDetails('346578888888', contact, function(details) {
        assert.deepEqual(details, {
          isContact: true,
          title: 'Pepito Grillo',
          carrier: 'Mobile | TEF'
        });
      });

      Utils.getPhoneDetails('12125559999', contact, function(details) {
        assert.deepEqual(details, {
          isContact: true,
          title: 'Pepito Grillo',
          carrier: 'Batphone | XXX'
        });
      });
    });

    test('(number, null, callback)', function() {
      var contact = new MockContact();

      Utils.getPhoneDetails('346578888888', null, function(details) {
        assert.deepEqual(details, {
          title: '346578888888'
        });
      });
    });

    test('(number (wrong number), contact, callback)', function() {
      var contact = new MockContact();

      Utils.getPhoneDetails('99999999', contact, function(details) {
        assert.deepEqual(details, {
          isContact: true,
          title: 'Pepito Grillo',
          carrier: 'Mobile | TEF'
        });
      });
    });

    test('(number, contact (blank name), callback)', function() {
      var contact = new MockContact();
      var name = contact.name[0];

      // Remove the name value
      contact.name[0] = '';

      Utils.getPhoneDetails('346578888888', contact, function(details) {
        assert.deepEqual(details, {
          isContact: true,
          title: '346578888888',
          carrier: 'Mobile | TEF'
        });

        // Restore the name
        contact.name[0] = name;
      });
    });
  });
});

suite('Utils.Message', function() {
  suite('format', function() {
    test('escapes HTML; converts spaces and newlines', function() {
      var fixture = [
        '<p>"Hello!"&  \' </p>',
        'world'
      ].join('\r\n');

      assert.equal(
        Utils.Message.format(fixture),
        '&lt;p&gt;&quot;Hello!&quot;&amp; &nbsp;&apos; &lt;/p&gt;<br>world'
      );
    });
  });
});

suite('Utils.Template', function() {

  suite('extracted template strings', function() {
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
