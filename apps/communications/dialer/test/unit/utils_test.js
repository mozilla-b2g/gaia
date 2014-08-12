/* global MockContacts, MockL10n, Utils */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/mock_l10n.js');

require('/shared/js/dialer/utils.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('dialer/utils', function() {
  var realL10n;
  var subject;
  var number = '555-555-555-555';

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    subject = Utils;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('Utility library', function() {
    setup(function() {
      this.sinon.spy(MockL10n, 'get');
    });

    test('#additional info WITHOUT carrier', function() {
      MockContacts.mCarrier = null; // No carrier
      MockContacts.findByNumber(number, function(contact, matchingTel) {
        var additionalInfo = subject.getPhoneNumberAdditionalInfo(matchingTel,
          contact, number);
        sinon.assert.calledWith(MockL10n.get, MockContacts.mType);
        assert.equal(MockContacts.mType, additionalInfo);
      });
    });

    test('#additional info WITH carrier', function() {
      MockContacts.mCarrier = 'carrier'; // Carrier value
      MockContacts.findByNumber(number, function(contact, matchingTel) {
        var additionalInfo = subject.getPhoneNumberAdditionalInfo(matchingTel,
          contact, number);
        sinon.assert.calledWith(MockL10n.get, MockContacts.mType);
        assert.equal(MockContacts.mType + ', ' +
          MockContacts.mCarrier, additionalInfo);
      });
    });

    test('phone number and type', function() {
      MockContacts.findByNumber(number, function(contact, matchingTel) {
        var additionalInfo = subject.getPhoneNumberAndType(
          matchingTel, contact, number);
        sinon.assert.calledWith(MockL10n.get, MockContacts.mType);
        assert.equal(MockContacts.mType + ', ' + number, additionalInfo);
      });
    });

    test('should not translate custom types', function() {
      var customType = 'totally custom';

      MockContacts.mCarrier = 'carrier';
      MockContacts.mType = customType;

      MockContacts.findByNumber(number, function(contact, matchingTel) {
        var additionalInfo = subject.getPhoneNumberAdditionalInfo(matchingTel,
          contact, number);
        sinon.assert.calledWith(MockL10n.get, customType);
        assert.equal(customType +', ' + MockContacts.mCarrier, additionalInfo);
      });
    });

    test('#headerDate should identify yesterday as a time range', function() {
      var timestamp = Math.round(new Date().getTime() / 1000);
      var tsYesterday = (timestamp - (25 * 3600)) * 1000;
      assert.equal(subject.headerDate(tsYesterday), 'yesterday');
      sinon.assert.calledWith(MockL10n.get, 'yesterday');
    });

    test('#headerDate should identify today as a time range', function() {
      var tsToday = Math.round(new Date().getTime());
      assert.equal(subject.headerDate(tsToday), 'today');
      sinon.assert.calledWith(MockL10n.get, 'today');
    });

    test('#headerDate should format 3 days ago as a weekday name', function() {
      this.sinon.spy(MockL10n.DateTimeFormat.prototype, 'localeFormat');
      var ts = Math.round(new Date().getTime() / 1000);
      var ts3DaysAgo = (ts - (73 * 3600)) * 1000;
      assert.equal(subject.headerDate(ts3DaysAgo),
                   JSON.stringify(new Date(ts3DaysAgo)) + '%A');
      sinon.assert.calledWith(MockL10n.DateTimeFormat.prototype.localeFormat,
                              new Date(ts3DaysAgo), '%A');
    });

    test('#headerDate should format a week ago as a date', function() {
      this.sinon.spy(MockL10n.DateTimeFormat.prototype, 'localeFormat');
      var ts = Math.round(new Date().getTime() / 1000);
      var tsWeekAgo = (ts - (193 * 3600)) * 1000;
      assert.equal(subject.headerDate(tsWeekAgo),
                   JSON.stringify(new Date(tsWeekAgo)) + '%x');
      sinon.assert.calledWith(MockL10n.DateTimeFormat.prototype.localeFormat,
                              new Date(tsWeekAgo), '%x');
    });

    test('#headerDate should identify incorrect date', function() {
      assert.equal(subject.headerDate('not-a-date'), 'incorrectDate');
      sinon.assert.calledWith(MockL10n.get, 'incorrectDate');
    });

    test('#prettyDate should identify 12 hour time', function() {
      var tsToday = Math.round(new Date().getTime());
      var formatted = JSON.stringify(new Date(tsToday));
      window.navigator.mozHour12 = true;
      assert.equal(subject.prettyDate(tsToday),
                   formatted + 'shortTimeFormat12');
    });

    test('#prettyDate should identify 24 hour time', function() {
      var tsToday = Math.round(new Date().getTime());
      var formatted = JSON.stringify(new Date(tsToday));
      window.navigator.mozHour12 = false;
      assert.equal(subject.prettyDate(tsToday),
                   formatted + 'shortTimeFormat24');
    });
  });

  suite('prettyDuration', function() {
    test('formats as minutes if less than one hour', function() {
      var pretty = Utils.prettyDuration(60 * 60 * 1000 - 1);
      assert.equal(pretty, 'callDurationMinutes{"h":"00","m":59,"s":59}');
    });

    test('formats with hours if more than one hour', function() {
      var pretty = Utils.prettyDuration(60 * 60 * 1000);
      assert.equal(pretty, 'callDurationHours{"h":"01","m":"00","s":"00"}');
    });

    test('Single digits are padded', function() {
      var hours = 2;
      var minutes = 4;
      var seconds = 7;
      var duration = hours * 60 * 60 + minutes * 60 + seconds;
      var pretty = Utils.prettyDuration(duration * 1000);
      assert.equal(pretty, 'callDurationHours{"h":"02","m":"04","s":"07"}');
    });
  });
});
