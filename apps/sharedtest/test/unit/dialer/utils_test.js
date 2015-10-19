/* global MockL10n, Utils, l10nAssert */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/mock_l10n.js');

require('/shared/js/dialer/utils.js');

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
    test('#headerDate should identify yesterday as a time range', function() {
      var timestamp = Math.round(new Date().getTime() / 1000);
      var tsYesterday = (timestamp - (25 * 3600)) * 1000;
      var elem = document.createElement('span');
      subject.setHeaderDate(elem, tsYesterday);
      l10nAssert(elem, 'yesterday');
    });

    test('#headerDate should identify today as a time range', function() {
      var tsToday = Math.round(new Date().getTime());
      var elem = document.createElement('span');
      subject.setHeaderDate(elem, tsToday);
      l10nAssert(elem, 'today');
    });

    test('#headerDate should format 3 days ago as a weekday name', function() {
      var ts = Math.round(new Date().getTime() / 1000);
      var ts3DaysAgo = (ts - (73 * 3600)) * 1000;
      var threeDaysAgo = new
        Date(ts3DaysAgo).toLocaleString(navigator.languages, {
          weekday: 'long'
        });
      var elem = document.createElement('span');
      subject.setHeaderDate(elem, ts3DaysAgo);
      assert.equal(elem.textContent, threeDaysAgo);
    });

    test('#headerDate should format a week ago as a date', function() {
      var ts = Math.round(new Date().getTime() / 1000);
      var tsWeekAgo = (ts - (193 * 3600)) * 1000;
      var weekAgo = new
        Date(tsWeekAgo).toLocaleString(navigator.languages, {
          year: '2-digit',
          month: '2-digit',
          day: '2-digit'
        });
      var elem = document.createElement('span');
      subject.setHeaderDate(elem, tsWeekAgo);
      assert.equal(elem.textContent, weekAgo);
    });

    test('#headerDate should identify incorrect date', function() {
      var elem = document.createElement('span');
      subject.setHeaderDate(elem, 'not-a-date');
      l10nAssert(elem, 'incorrectDate');
    });

    test('#prettyDate should identify 12 hour time', function() {
      var tsToday = Math.round(new Date().getTime());
      window.navigator.mozHour12 = true;
      var hourString = new
        Date(tsToday).toLocaleString(navigator.languages, {
          hour12: navigator.mozHour12,
          hour: 'numeric',
          minute: 'numeric'
        });
      assert.equal(subject.prettyDate(tsToday), hourString);
    });

    test('#prettyDate should identify 24 hour time', function() {
      var tsToday = Math.round(new Date().getTime());
      window.navigator.mozHour12 = false;
      var hourString = new
        Date(tsToday).toLocaleString(navigator.languages, {
          hour12: navigator.mozHour12,
          hour: 'numeric',
          minute: 'numeric'
        });
      assert.equal(subject.prettyDate(tsToday), hourString);
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

    suite('getPhoneNumberAdditionalInfo()', function() {
      var dummyCarrier = 'Dummy carrier';
      var dummyCustomType = 'My custom type';

      test('No type, no carrier', function() {
        var result = Utils.getPhoneNumberAdditionalInfo({});

        assert.deepEqual(result, {id: 'phone_type_mobile', args: null});
      });

      test('Specific type, no carrier', function() {
        var result = Utils.getPhoneNumberAdditionalInfo({
          type: 'work'
        });

        assert.deepEqual(result, {id: 'phone_type_work', args: null});
      });

      test('Custom type, no carrier', function() {
        var result = Utils.getPhoneNumberAdditionalInfo({
          type: dummyCustomType
        });

        assert.propertyVal(result, 'id', 'phone_type_custom');
        assert.deepPropertyVal(result, 'args.type', dummyCustomType);
      });

      test('No type with carrier', function() {
        var result = Utils.getPhoneNumberAdditionalInfo({
          carrier: dummyCarrier
        });

        assert.propertyVal(result, 'id', 'phone_type_mobile_and_carrier');
        assert.deepPropertyVal(result, 'args.carrier', dummyCarrier);
      });

      test('Specific type with carrier', function() {
        var result = Utils.getPhoneNumberAdditionalInfo({
          carrier: dummyCarrier,
          type: 'work'
        });

        assert.propertyVal(result, 'id', 'phone_type_work_and_carrier');
        assert.deepPropertyVal(result, 'args.carrier', dummyCarrier);
      });

      test('Custom type with carrier', function() {
        var result = Utils.getPhoneNumberAdditionalInfo({
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
