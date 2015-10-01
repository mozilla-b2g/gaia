'use strict';

/* global mozIntl, MockL10n */

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/js/moz_intl.js');

suite('MozIntl', function() {
  var realL10n;
  var ms = 1;
  var sec = ms * 1000;
  var min = sec * 60;
  var hour = min * 60;
  var day = hour * 24;
  var rawYear = day / 400 * 146097;
  var week = day * 7;
  var month = Math.round(rawYear / 12);
  //var quarter = Math.round(rawYear / 4);
  var year = Math.round(rawYear);



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
    test('with no arguments use defaults', function() {

      var intlFormatter = Intl.DateTimeFormat();

      var formatter = mozIntl.DateTimeFormat();
      var options = formatter.resolvedOptions();
      var intlOptions = intlFormatter.resolvedOptions();

      assert.equal(options.locale, intlOptions.locale);
      assert.equal(options.hour12, intlOptions.hour12);
      assert.equal(options.dayperiod, intlOptions.hour12);
    });

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
        if (args[0] === 'durationPattern') {
          return Promise.resolve('hh:mm:ss.SS');
        }
        return MockL10n.formatValue(...args);
      });
    });

    test('with no arguments use defaults', function(done) {
      mozIntl.DurationFormat().then(formatter => {
        const options = formatter.resolvedOptions();
        assert.equal(options.maxUnit, 'hour');
        assert.equal(options.minUnit, 'second');
        assert.equal(options.locale, navigator.language);
      }).then(done, done);
    });

    suite('hms duration', function() {
      test('with no hours', function(done) {
        // 2 min, 1 sec
        var ms = (2 * 1000 * 60) + (1 * 1000);

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'minute',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '00:02');
        }).then(done, done);
      });

      test('with hours', function(done) {
        // 13h, 10 min, 21 sec
        var ms = (13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000);

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '13:10:21');
        }).then(done, done);
      });

      test('with seconds rounded down', function(done) {
        // 13h, 10 min, 21 sec, 400ms
        var ms = (13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000) + 400;

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '13:10:21');
        }).then(done, done);
      });

      test('with seconds rounded up', function(done) {
        // 13h, 10 min, 21 sec, 600ms
        var ms = (13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000) + 600;

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '13:10:22');
        }).then(done, done);
      });

      test('with negative values', function(done) {
        // - 13h, 10 min, 21 sec
        var ms = ((13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000)) * -1;

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '-13:10:21');
        }).then(done, done);
      });
    });

    suite('msS duration', function() {
      test('with no minutes', function(done) {
        // 5 sec, 200ms
        var ms = (5 * 1000) + 200;

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '00:05.20');
        }).then(done, done);
      });

      test('with minutes', function(done) {
        // 10 min, 21 sec, 150ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 150;

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '10:21.15');
        }).then(done, done);
      });

      test('with milliseconds rounded down', function(done) {
        // 10 min, 21 sec, 154ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 154;

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '10:21.15');
        }).then(done, done);
      });

      test('with milliseconds rounded up', function(done) {
        // 10 min, 21 sec, 156ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 156;

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '10:21.16');
        }).then(done, done);
      });

      test('with milliseconds below treshold', function(done) {
        // 10 min, 21 sec, 156ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 4;

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '10:21.00');
        }).then(done, done);
      });

      test('with negative values', function(done) {
        // 10 min, 21 sec, 156ms
        var ms = ((10 * 1000 * 60) + (21 * 1000)) * -1;

        mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        }).then(formatter => {
          var string = formatter.format(ms);

          assert.strictEqual(string, '-10:21.00');
        }).then(done, done);
      });
    });
  });

  suite('RelativeTimeFormat', function() {
    setup(function() {
      this.sinon.stub(navigator.mozL10n, 'formatValue', function(id, args) {
        return Promise.resolve({
          id: id,
          args: args
        });
      });
    });

    suite('minutes', function() {
      test('1 minute ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() - 1 * min).then(string => {
          assert.deepEqual(string, {
            id: 'minutes-ago-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('5 minutes ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() - 5 * min).then(string => {
          assert.deepEqual(string, {
            id: 'minutes-ago-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('80 minutes ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() - 80 * min).then(string => {
          assert.deepEqual(string, {
            id: 'minutes-ago-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });

      test('in 1 minute', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() + 1 * min).then(string => {
          assert.deepEqual(string, {
            id: 'minutes-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('in 5 minutes', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() + 5 * min).then(string => {
          assert.deepEqual(string, {
            id: 'minutes-until-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('in 80 minutes', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() + 80 * min).then(string => {
          assert.deepEqual(string, {
            id: 'minutes-until-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });
    });

    suite('hours', function() {
      test('1 hour ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() - 1 * hour).then(string => {
          assert.deepEqual(string, {
            id: 'hours-ago-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('5 hours ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() - 5 * hour).then(string => {
          assert.deepEqual(string, {
            id: 'hours-ago-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('80 hours ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() - 80 * hour).then(string => {
          assert.deepEqual(string, {
            id: 'hours-ago-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });

      test('in 1 hour', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() + 1 * hour).then(string => {
          assert.deepEqual(string, {
            id: 'hours-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('in 5 hours', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() + 5 * hour).then(string => {
          assert.deepEqual(string, {
            id: 'hours-until-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('in 80 hours', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() + 80 * hour).then(string => {
          assert.deepEqual(string, {
            id: 'hours-until-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });
    });

    suite('days', function() {
      test('1 day ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() - 1 * day).then(string => {
          assert.deepEqual(string, {
            id: 'days-ago-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('5 days ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() - 5 * day).then(string => {
          assert.deepEqual(string, {
            id: 'days-ago-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('80 days ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() - 80 * day).then(string => {
          assert.deepEqual(string, {
            id: 'days-ago-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });

      test('in 1 day', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() + 1 * day).then(string => {
          assert.deepEqual(string, {
            id: 'days-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('in 5 days', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() + 5 * day).then(string => {
          assert.deepEqual(string, {
            id: 'days-until-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('in 80 days', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() + 80 * day).then(string => {
          assert.deepEqual(string, {
            id: 'days-until-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });
    });

    suite('weeks', function() {
      test('1 week ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() - 1 * week).then(string => {
          assert.deepEqual(string, {
            id: 'weeks-ago-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('5 weeks ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() - 5 * week).then(string => {
          assert.deepEqual(string, {
            id: 'weeks-ago-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('80 weeks ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() - 80 * week).then(string => {
          assert.deepEqual(string, {
            id: 'weeks-ago-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });

      test('in 1 week', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() + 1 * week).then(string => {
          assert.deepEqual(string, {
            id: 'weeks-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('in 5 weeks', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() + 5 * week).then(string => {
          assert.deepEqual(string, {
            id: 'weeks-until-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('in 80 weeks', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() + 80 * week).then(string => {
          assert.deepEqual(string, {
            id: 'weeks-until-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });
    });

    suite('months', function() {
      test('1 month ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() - 1 * month).then(string => {
          assert.deepEqual(string, {
            id: 'months-ago-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('5 months ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() - 5 * month).then(string => {
          assert.deepEqual(string, {
            id: 'months-ago-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('80 months ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() - 80 * month).then(string => {
          assert.deepEqual(string, {
            id: 'months-ago-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });

      test('in 1 month', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() + 1 * month).then(string => {
          assert.deepEqual(string, {
            id: 'months-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('in 5 months', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() + 5 * month).then(string => {
          assert.deepEqual(string, {
            id: 'months-until-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('in 80 months', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() + 80 * month).then(string => {
          assert.deepEqual(string, {
            id: 'months-until-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });
    });

    suite('years', function() {
      test('1 year ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() - 1 * year).then(string => {
          assert.deepEqual(string, {
            id: 'years-ago-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('5 years ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() - 5 * year).then(string => {
          assert.deepEqual(string, {
            id: 'years-ago-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('80 years ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() - 80 * year).then(string => {
          assert.deepEqual(string, {
            id: 'years-ago-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });

      test('in 1 year', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() + 1 * year).then(string => {
          assert.deepEqual(string, {
            id: 'years-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('in 5 years', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() + 5 * year).then(string => {
          assert.deepEqual(string, {
            id: 'years-until-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('in 80 years', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() + 80 * year).then(string => {
          assert.deepEqual(string, {
            id: 'years-until-long',
            args: {
              value: 80
            }
          });
        }).then(done, done);
      });
    });

    suite('bestFit', function() {
      test('1 hour ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit',
        });
        
        f.format(Date.now() - 1 * hour).then(string => {
          assert.deepEqual(string, {
            id: 'hours-ago-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('in 1 hour', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit',
        });
        
        f.format(Date.now() + 1 * hour).then(string => {
          assert.deepEqual(string, {
            id: 'hours-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('now', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit',
        });
        
        // mozIntl does not support seconds, Intl API will
        f.format(Date.now() + 0).then(string => {
          assert.deepEqual(string, {
            id: 'minutes-until-long',
            args: {
              value: 0
            }
          });
        }).then(done, done);
      });

      test('maximum value', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit',
        });
        
        f.format(Date.now() + 500 * year).then(string => {
          assert.deepEqual(string, {
            id: 'years-until-long',
            args: {
              value: 500
            }
          });
        }).then(done, done);
      });
    });

    suite('rounding', function() {
      test('1h59m59s300ms => in 2 hours with specific unit', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        // 1h59m59s300ms
        var ms = 1 * hour + 59 * min + 59 * sec + 300;

        f.format(Date.now() + ms).then(string => {
          assert.deepEqual(string, {
            id: 'hours-until-long',
            args: {
              value: 2
            }
          });
        }).then(done, done);
      });

      test('1h59m59s300ms => in 2 hours with bestFit', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        // 1h59m59s300ms
        var ms = 1 * hour + 59 * min + 59 * sec + 300;

        f.format(Date.now() + ms).then(string => {
          assert.deepEqual(string, {
            id: 'hours-until-long',
            args: {
              value: 2
            }
          });
        }).then(done, done);
      });

      test('should round ms+s if target token is minutes', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit'
        });

        f.format(Date.now() + 2 * min - 500).then(string => {
          assert.deepEqual(string, {
            id: 'minutes-until-long',
            args: {
              value: 2
            }
          });
        }).then(done, done);
      });

      test('should round ms+s+m if target token is hours', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit'
        });

        f.format(Date.now() + 2 * hour - 500).then(string => {
          assert.deepEqual(string, {
            id: 'hours-until-long',
            args: {
              value: 2
            }
          });
        }).then(done, done);
      });

      test('should bump the next token if almost there', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit'
        });

        f.format(Date.now() + 1 * week - 500).then(string => {
          assert.deepEqual(string, {
            id: 'weeks-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('should not bump the next token if there is none', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit'
        });

        f.format(Date.now() + 1 * year - 500).then(string => {
          assert.deepEqual(string, {
            id: 'years-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });
    });
  });

  suite('date', function() {
    suite('durationPart', function() {
      test('negative minutes', function() {
        var result = mozIntl._gaia.relativePart(-44 * min);
        assert.deepEqual(result, {unit: 'minutes', value: 44});
      });

      test('multiple values', function() {
        var result = mozIntl._gaia.relativePart(2 * hour + 2 * min);
        assert.deepEqual(result, {unit: 'hours', value: 2});
      });

      test('round low values to minutes', function() {
        var result = mozIntl._gaia.relativePart(20 * sec);
        assert.deepEqual(result, {unit: 'minutes', value: 0});

        var result2 = mozIntl._gaia.relativePart(30 * sec);
        assert.deepEqual(result2, {unit: 'minutes', value: 1});
      });
    });

    suite('relativeDate', function() {
      setup(function() {
        this.sinon.stub(navigator.mozL10n, 'formatValue', function(id, args) {
          return Promise.resolve({
            id: id,
            args: args
          });
        });
      });

      test('maxDiff is null', function(done) {
        var time = Date.now() - 86400 * 20 * 1000;
        var formatter = mozIntl._gaia.RelativeDate(navigator.languages);
        formatter.format(time).then(result => {
          assert.ok(result.indexOf('/') !== -1);
        }).then(done, done);
      });

      test('maxDiff is specified', function(done) {
        var time = Date.now() - 86400 * 20 * 1000;
        var formatter = mozIntl._gaia.RelativeDate(navigator.languages, {
          style: 'long'
        });
        formatter.format(time, (86400 * 21)).then(result => {
          assert.deepEqual(result, {
            id: 'weeks-ago-long',
            args: {
              value: 3
            }
          });
        }).then(done, done);
      });

      test('default style', function(done) {
        var time = Date.now() - 86400 * 5 * 1000;
        var formatter = mozIntl._gaia.RelativeDate(navigator.languages);
        formatter.format(time).then(result => {
          assert.deepEqual(result, {
            id: 'days-ago-long',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('style is short', function(done) {
        var time = Date.now() - 86400 * 5 * 1000;
        var formatter = mozIntl._gaia.RelativeDate(navigator.languages, {
          style: 'short'
        });
        formatter.format(time).then(result => {
          assert.deepEqual(result, {
            id: 'days-ago-short',
            args: {
              value: 5
            }
          });
        }).then(done, done);
      });

      test('now', function(done) {
        var time = Date.now() - 29 * 1000;
        var formatter = mozIntl._gaia.RelativeDate(navigator.languages);
        formatter.format(time).then(result => {
          assert.deepEqual(result, {
            id: 'minutes-until-long',
            args: {
              value: 0
            }
          });
        }).then(done, done);
      });

      test('in a minute', function(done) {
        // pretty date used 35
        var time = Date.now() + 45 * 1000;
        var formatter = mozIntl._gaia.RelativeDate(navigator.languages);
        formatter.format(time).then(result => {
          assert.deepEqual(result, {
            id: 'minutes-until-long',
            args: {
              value: 1
            }
          });
        }).then(done, done);
      });

      test('in two minutes', function(done) {
        var time = Date.now() + 1.8 * 60 * 1000;
        var formatter = mozIntl._gaia.RelativeDate(navigator.languages);
        formatter.format(time).then(result => {
          assert.deepEqual(result, {
            id: 'minutes-until-long',
            args: {
              value: 2
            }
          });
        }).then(done, done);
      });

      test('should discard ms if diff is over 1 minute', function(done) {
        var time = Date.now() + 2 * 60 * 1000 - 500;
        var formatter = mozIntl._gaia.RelativeDate(navigator.languages);
        formatter.format(time).then(result => {
          assert.deepEqual(result, {
            id: 'minutes-until-long',
            args: {
              value: 2
            }
          });
        }).then(done, done);
      });
    });
  });
});
