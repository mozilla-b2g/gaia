'use strict';

/* global mozIntl, MockL10n */

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/js/moz_intl.js');

suite('MozIntl', function() {
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('listFormatter', function() {
    setup(function() {
      this.sinon.stub(navigator.mozL10n, 'formatValue', function(...args) {
        if (args[0] === 'listSeparator_middle') {
          return Promise.resolve(',\u0020');
        }
        return MockL10n.formatValue(...args);
      });
    });

    test('formats simple list', function(done) {
      var list = ['Mary', 'John', 'Nick'];
      mozIntl.formatList(list).then(string => {
        assert.strictEqual(string, 'Mary, John, Nick');
      }).then(done, done);
    });
  });

  suite('DateTimeFormat', function() {
    test('get time with dayperiod', function() {
      var formatter = mozIntl.DateTimeFormat(navigator.languages, {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        dayperiod: true
      });
      var string = formatter.format(new Date()).toLowerCase();

      assert.isTrue(
        string.indexOf('am') !== -1 || string.indexOf('pm') !== -1);
    });

    test('get time without dayperiod', function() {
      var formatter = mozIntl.DateTimeFormat(navigator.languages, {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        dayperiod: false
      });
      var string = formatter.format(new Date()).toLowerCase();

      assert.isTrue(
        string.indexOf('am') === -1 && string.indexOf('pm') === -1);
    });

    test('get time without dayperiod when hour12 is false', function() {
      var formatter = mozIntl.DateTimeFormat(navigator.languages, {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        dayperiod: true
      });
      var string = formatter.format(new Date()).toLowerCase();

      assert.isTrue(
        string.indexOf('am') === -1 && string.indexOf('pm') === -1);
    });

    test('get dayperiod', function() {
      var formatter = mozIntl.DateTimeFormat(navigator.languages, {
        dayperiod: true
      });
      var string = formatter.format(new Date()).toLowerCase();

      assert.isTrue(
        string === 'am' || string === 'pm');
    });

    test('get dayperiod when hour is numeric', function() {
      var formatter = mozIntl.DateTimeFormat(navigator.languages, {
        hour: 'numeric',
        dayperiod: true
      });
      var string = formatter.format(new Date()).toLowerCase();

      assert.isTrue(
        string.indexOf('am') !== -1 || string.indexOf('pm') !== -1);
    });

    test('format dayperiod token', function() {
      var formatter = mozIntl.DateTimeFormat(navigator.languages, {
        hour: 'numeric',
        minute: 'numeric',
        dayperiod: true
      });
      var string = formatter.format(new Date(), {
        dayperiod: '<small>$&</small>'
      }).toLowerCase();

      assert.isTrue(
        string.indexOf('<small>am</small>') !== -1 ||
        string.indexOf('<small>pm</small>') !== -1);
    });

    test('format day token', function() {
      var formatter = mozIntl.DateTimeFormat(navigator.languages, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      var string = formatter.format(new Date(), {
        day: '<strong>$&</strong>'
      });

      var today = (new Date()).getDate();

      assert.isTrue(string.indexOf('<strong>' + today + '</strong>') !== -1);
    });

    test('format weekday token', function() {
      var formatter = mozIntl.DateTimeFormat(navigator.languages, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      var string = formatter.format(new Date(), {
        weekday: '<strong>$&</strong>'
      });

      var today = (new Date()).toLocaleString(navigator.languages, {
        weekday: 'long'
      });

      assert.isTrue(string.indexOf('<strong>' + today + '</strong>') !== -1);
    });

    test('format two tokens', function() {
      var formatter = mozIntl.DateTimeFormat(navigator.languages, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      var string = formatter.format(new Date(), {
        weekday: '<strong>$&</strong>',
        day: '<small>$&</small>'
      });

      var weekday = (new Date()).toLocaleString(navigator.languages, {
        weekday: 'long'
      });
      var day = (new Date()).getDate();

      assert.isTrue(string.indexOf('<strong>' + weekday + '</strong>') !== -1);
      assert.isTrue(string.indexOf('<small>' + day + '</small>') !== -1);
    });

    test('formatting overlapping tokens fails', function() {
      // This test should be removed once we fix the implementation

      var formatter = mozIntl.DateTimeFormat('en-US', {
        day: 'numeric',
        year: 'numeric',
        month: 'numeric'
      });
      var string = formatter.format(new Date(2015, 10, 1, 9, 38), {
        day: '<strong>$&</strong>'
      });

      // Should be 11/<strong>1</strong>/2015
      assert.strictEqual(string, '<strong>1</strong>1/1/2015');
    });
  });

  suite('calendarInfo', function() {
    setup(function() {
      this.sinon.stub(navigator.mozL10n, 'formatValue', function(...args) {
        if (args[0] === 'firstDayOfTheWeek') {
          // formatValue returns a string
          return Promise.resolve('0');
        }
        return MockL10n.formatValue(...args);
      });
    });

    test('get first day of the week as Sunday', function(done) {
      mozIntl.calendarInfo('firstDayOfTheWeek').then(day => {
        // make sure that returned value is an integer
        assert.strictEqual(day, 0);
      }).then(done, done);
    });
  });

  suite('DurationFormat', function() {
    setup(function() {
      this.sinon.stub(navigator.mozL10n, 'formatValue', function(...args) {
        if (args[0] === 'timePattern_hms') {
          return Promise.resolve('hh:mm:ss');
        }
        if (args[0] === 'timePattern_msS') {
          return Promise.resolve('mm:ss.SS');
        }
        return MockL10n.formatValue(...args);
      });
    });

    suite('hms duration', function() {
      test('with no hours', function(done) {
        // 2 min, 1 sec
        var ms = (2 * 1000 * 60) + (1 * 1000);

        mozIntl.DurationFormat(navigator.languages, {
          type: 'hms'
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '00:02:01');
        }).then(done, done);
      });

      test('with hours', function(done) {
        // 13h, 10 min, 21 sec
        var ms = (13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000);

        mozIntl.DurationFormat(navigator.languages, {
          type: 'hms'
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '13:10:21');
        }).then(done, done);
      });

      test('with seconds rounded down', function(done) {
        // 13h, 10 min, 21 sec, 400ms
        var ms = (13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000) + 400;

        mozIntl.DurationFormat(navigator.languages, {
          type: 'hms'
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '13:10:21');
        }).then(done, done);
      });

      test('with seconds rounded up', function(done) {
        // 13h, 10 min, 21 sec, 600ms
        var ms = (13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000) + 600;

        mozIntl.DurationFormat(navigator.languages, {
          type: 'hms'
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '13:10:22');
        }).then(done, done);
      });
    });

    suite('msS duration', function() {
      test('with no minutes', function(done) {
        // 5 sec, 200ms
        var ms = (5 * 1000) + 200;

        mozIntl.DurationFormat(navigator.languages, {
          type: 'msS'
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '00:05.20');
        }).then(done, done);
      });

      test('with minutes', function(done) {
        // 10 min, 21 sec, 150ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 150;

        mozIntl.DurationFormat(navigator.languages, {
          type: 'msS'
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '10:21.15');
        }).then(done, done);
      });

      test('with milliseconds rounded down', function(done) {
        // 10 min, 21 sec, 154ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 154;

        mozIntl.DurationFormat(navigator.languages, {
          type: 'msS'
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '10:21.15');
        }).then(done, done);
      });

      test('with milliseconds rounded up', function(done) {
        // 10 min, 21 sec, 156ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 156;

        mozIntl.DurationFormat(navigator.languages, {
          type: 'msS'
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '10:21.16');
        }).then(done, done);
      });

      test('with milliseconds below treshold', function(done) {
        // 10 min, 21 sec, 156ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 4;

        mozIntl.DurationFormat(navigator.languages, {
          type: 'msS'
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '10:21.00');
        }).then(done, done);
      });
    });
  });
});
