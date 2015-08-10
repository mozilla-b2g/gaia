/* global MockL10n, Utils */

'use strict';

require('/shared/js/dialer/utils.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('dialer/utils', function() {
  var realL10n;
  var subject;

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
    var durationNode;

    setup(function() {
      durationNode = document.createElement('div');
      this.sinon.spy(MockL10n, 'setAttributes');
    });

    test('formats as minutes if less than one hour', function() {
      Utils.prettyDuration(durationNode, 60 * 60 * 1000 - 1);
      sinon.assert.calledWith(MockL10n.setAttributes, durationNode,
        'callDurationMinutes', { h: '00', m: '59', s: '59' });
    });

    test('formats with hours if more than one hour', function() {
      Utils.prettyDuration(durationNode, 60 * 60 * 1000);
      sinon.assert.calledWith(MockL10n.setAttributes, durationNode,
        'callDurationHours', { h: '01', m: '00', s: '00' });
    });

    test('Single digits are padded', function() {
      var hours = 2;
      var minutes = 4;
      var seconds = 7;
      var duration = hours * 60 * 60 + minutes * 60 + seconds;
      Utils.prettyDuration(durationNode, duration * 1000);
      sinon.assert.calledWith(MockL10n.setAttributes, durationNode,
        'callDurationHours', { h: '02', m: '04', s: '07' });
    });

    suite('When using text format', function() {
      test('single digits are not padded', function() {
        var hours = 1;
        var minutes = 4;
        var seconds = 2;
        var duration = hours * 60 * 60 + minutes * 60 + seconds;
        Utils.prettyDuration(durationNode, duration * 1000,
                             'callDurationTextFormat');
        sinon.assert.calledWith(MockL10n.setAttributes, durationNode,
          'callDurationTextFormatHours', { h: '1', m: '4', s: '2' });
      });

      test('formats as minutes if less than one hour', function() {
        Utils.prettyDuration(durationNode, 60 * 60 * 1000 - 1,
                             'callDurationTextFormat');
        sinon.assert.calledWith(MockL10n.setAttributes, durationNode,
          'callDurationTextFormatMinutes', { h: '0', m: '59', s: '59' });
      });

      test('formats as seconds if less than one minute', function() {
        Utils.prettyDuration(durationNode, 60 * 1000 - 1,
                             'callDurationTextFormat');
        sinon.assert.calledWith(MockL10n.setAttributes, durationNode,
          'callDurationTextFormatSeconds', { h: '0', m: '0', s: '59' });
      });
    });

    suite('isPhoneType()', function() {
      test('Identifies known phone types correctly', function() {
        [
          'mobile',
          'home',
          'work',
          'personal',
          'faxHome',
          'faxOffice',
          'faxOther',
          'other'
        ].forEach(type => { assert.isTrue(Utils.isPhoneType(type)); });
      });
      test('Identifies unknown types correctly', function() {
        assert.isFalse(Utils.isPhoneType('custom-phone-type'));
      });
    });

    suite('getLocalizedPhoneNumberAdditionalInfo()', function() {
      var dummyCarrier = 'Dummy carrier';
      var dummyCustomType = 'My custom type';

      test('No type, no carrier', function() {
        var result = Utils.getLocalizedPhoneNumberAdditionalInfo({});

        assert.equal(result, 'phone_type_mobile');
      });

      test('Specific type, no carrier', function() {
        var result = Utils.getLocalizedPhoneNumberAdditionalInfo({
          type: 'work'
        });

        assert.equal(result, 'phone_type_work');
      });

      test('Custom type, no carrier', function() {
        var result = Utils.getLocalizedPhoneNumberAdditionalInfo({
          type: dummyCustomType
        });

        assert.propertyVal(result, 'id', 'phone_type_custom');
        assert.deepPropertyVal(result, 'args.type', dummyCustomType);
      });

      test('No type with carrier', function() {
        var result = Utils.getLocalizedPhoneNumberAdditionalInfo({
          carrier: dummyCarrier
        });

        assert.propertyVal(result, 'id', 'phone_type_mobile_and_carrier');
        assert.deepPropertyVal(result, 'args.carrier', dummyCarrier);
      });

      test('Specific type with carrier', function() {
        var result = Utils.getLocalizedPhoneNumberAdditionalInfo({
          carrier: dummyCarrier,
          type: 'work'
        });

        assert.propertyVal(result, 'id', 'phone_type_work_and_carrier');
        assert.deepPropertyVal(result, 'args.carrier', dummyCarrier);
      });

      test('Custom type with carrier', function() {
        var result = Utils.getLocalizedPhoneNumberAdditionalInfo({
          carrier: dummyCarrier,
          type: dummyCustomType
        });

        assert.propertyVal(result, 'id', 'phone_type_custom_and_carrier');
        assert.deepPropertyVal(result, 'args.carrier', dummyCarrier);
        assert.deepPropertyVal(result, 'args.type', dummyCustomType);
      });
    });
  });
});
