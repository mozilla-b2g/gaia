'use strict';

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/js/utils.js');


suite('Utils', function() {
  suite('Utils.escapeHTML', function() {

    test('valid', function() {
      var fixture = '<div>"Hello!"&  \' </div>\r\n';

      assert.equal(
        Utils.escapeHTML(fixture),
        '&lt;div&gt;"Hello!"&amp; &nbsp;\' &lt;/div&gt;<br/>'
      );
      // There are zero uses of this optional signature, testing anyway.
      assert.equal(
        Utils.escapeHTML(fixture, true),
        '&lt;div&gt;&quot;Hello!&quot;&amp; &nbsp;&apos; &lt;/div&gt;<br/>'
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
