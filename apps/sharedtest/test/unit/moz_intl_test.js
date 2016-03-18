'use strict';

/* global mozIntl, MockL10n */

require('/shared/test/unit/mocks/mock_l20n.js');
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
    realL10n = document.l10n;
    document.l10n = MockL10n;
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
  });
/*
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
*/
  suite('calendarInfo', function() {
    setup(function() {
      this.sinon.stub(document.l10n, 'formatValue', function(...args) {
        if (args[0] === 'firstDayOfTheWeek') {
          // formatValue returns a string
          return Promise.resolve('0');
        }
        return MockL10n.formatValue(...args);
      });
    });

    test('get first day of the week as Sunday', function(done) {
      mozIntl.getCalendarInfo('firstDayOfTheWeek').then(day => {
        // make sure that returned value is an integer
        assert.strictEqual(day, 0);
      }).then(done, done);
    });
  });

  suite('DurationFormat', function() {
    setup(function() {
      this.sinon.stub(document.l10n, 'formatValue', function(...args) {
        if (args[0] === 'durationformat-pattern') {
          return Promise.resolve('{hh}:{mm}:{ss}.{SS}');
        }
        return MockL10n.formatValue(...args);
      });
    });

    test('with no arguments use defaults', function() {
      let f = new mozIntl.DurationFormat();
      
      const options = f.resolvedOptions();
      assert.equal(options.maxUnit, 'hour');
      assert.equal(options.minUnit, 'second');
      assert.equal(options.locale, navigator.language);
    });

    test('hh:mm', function(done) {
      // 2 min, 1 sec
      var ms = (2 * 1000 * 60) + (1 * 1000);

      let f = new mozIntl.DurationFormat(navigator.languages, {
        maxUnit: 'hour',
        minUnit: 'minute',
      });
      
      f.format(ms).then(string => {
        assert.strictEqual(string, '00:02');
      }).then(done, done);
    });

    test('mm:ss', function(done) {
      // 0 min, 1 sec
      var ms = (1 * 1000);

      let f = new mozIntl.DurationFormat(navigator.languages, {
        maxUnit: 'minute',
        minUnit: 'second',
      });
      
      f.format(ms).then(string => {
        assert.strictEqual(string, '00:01');
      }).then(done, done);
    });

    test('hh:mm:ss', function(done) {
      // 0 min, 1 sec
      var ms = (1 * 1000);

      let f = new mozIntl.DurationFormat(navigator.languages, {
        maxUnit: 'hour',
        minUnit: 'second',
      });
      
      f.format(ms).then(string => {
        assert.strictEqual(string, '00:00:01');
      }).then(done, done);
    });

    test('hh:mm:ss.SS', function(done) {
      // 0 min, 1 sec
      var ms = (1 * 1000);

      let f = new mozIntl.DurationFormat(navigator.languages, {
        maxUnit: 'hour',
        minUnit: 'millisecond',
      });
      
      f.format(ms).then(string => {
        assert.strictEqual(string, '00:00:01.00');
      }).then(done, done);
    });

    suite('hms duration', function() {
      test('with no hours', function(done) {
        // 2 min, 1 sec
        var ms = (2 * 1000 * 60) + (1 * 1000);

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '00:02:01');
        }).then(done, done);
      });

      test('with hours', function(done) {
        // 13h, 10 min, 21 sec
        var ms = (13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000);

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '13:10:21');
        }).then(done, done);
      });

      test('with seconds rounded down', function(done) {
        // 13h, 10 min, 21 sec, 400ms
        var ms = (13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000) + 400;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '13:10:21');
        }).then(done, done);
      });

      test('with seconds rounded up', function(done) {
        // 13h, 10 min, 21 sec, 600ms
        var ms = (13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000) + 600;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '13:10:22');
        }).then(done, done);
      });

      test('with negative values', function(done) {
        // - 13h, 10 min, 21 sec
        var ms = ((13 * 1000 * 60 * 60) + (10 * 1000 * 60) + (21 * 1000)) * -1;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '-13:10:21');
        }).then(done, done);
      });

      test('rounding of seconds pushes to a minute', function(done) {
        // 1 min
        var ms = 1 * 1000 * 60 - 20;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '00:01:00');
        }).then(done, done);
      });

      test('rounding of seconds pushes to an hour', function(done) {
        // 1 hour
        var ms = 1 * 60 * 60 * 1000 - 20;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'hour',
          minUnit: 'second',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '01:00:00');
        }).then(done, done);
      });
    });

    suite('msS duration', function() {
      test('with no minutes', function(done) {
        // 5 sec, 200ms
        var ms = (5 * 1000) + 200;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '00:05.20');
        }).then(done, done);
      });

      test('with minutes', function(done) {
        // 10 min, 21 sec, 150ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 150;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '10:21.15');
        }).then(done, done);
      });

      test('with milliseconds rounded down', function(done) {
        // 10 min, 21 sec, 154ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 154;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '10:21.15');
        }).then(done, done);
      });

      test('with milliseconds rounded up', function(done) {
        // 10 min, 21 sec, 156ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 156;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '10:21.16');
        }).then(done, done);
      });

      test('with milliseconds below treshold', function(done) {
        // 10 min, 21 sec, 156ms
        var ms = (10 * 1000 * 60) + (21 * 1000) + 4;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '10:21.00');
        }).then(done, done);
      });

      test('with negative values', function(done) {
        // 10 min, 21 sec, 156ms
        var ms = ((10 * 1000 * 60) + (21 * 1000)) * -1;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        });
        
        f.format(ms).then(string => {
          assert.strictEqual(string, '-10:21.00');
        }).then(done, done);
      });

      test('rounding of ms pushes to seconds', function(done) {
        // 1 hour
        var ms = 1 * 1000 - 2;

        let f = new mozIntl.DurationFormat(navigator.languages, {
          maxUnit: 'minute',
          minUnit: 'millisecond',
        });
        f.format(ms).then(string => {
          assert.strictEqual(string, '00:01.00');
        }).then(done, done);
      });
    });
  });

  suite('RelativeTimeFormat', function() {
    setup(function() {
      this.sinon.stub(document.l10n, 'formatValue', function(id, args) {
        return Promise.resolve('');
      });
    });

    suite('minutes', function() {
      test('1 minute ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() - 1 * min).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'minutes-ago-long', { value: 1 }));
        }).then(done, done);
      });

      test('5 minutes ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() - 5 * min).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'minutes-ago-long', { value: 5 }));
        }).then(done, done);
      });

      test('80 minutes ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() - 80 * min).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'minutes-ago-long', { value: 80 }));
        }).then(done, done);
      });

      test('in 1 minute', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() + 1 * min).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'minutes-until-long', { value: 1 }));
        }).then(done, done);
      });

      test('in 5 minutes', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() + 5 * min).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'minutes-until-long', { value: 5 }));
        }).then(done, done);
      });

      test('in 80 minutes', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'minute',
        });
        
        f.format(Date.now() + 80 * min).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'minutes-until-long', { value: 80 }));
        }).then(done, done);
      });
    });

    suite('hours', function() {
      test('1 hour ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() - 1 * hour).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-ago-long', { value: 1 }));
        }).then(done, done);
      });

      test('5 hours ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() - 5 * hour).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-ago-long', { value: 5 }));
        }).then(done, done);
      });

      test('80 hours ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() - 80 * hour).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-ago-long', { value: 80 }));
        }).then(done, done);
      });

      test('in 1 hour', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() + 1 * hour).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-until-long', { value: 1 }));
        }).then(done, done);
      });

      test('in 5 hours', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() + 5 * hour).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-until-long', { value: 5 }));
        }).then(done, done);
      });

      test('in 80 hours', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        f.format(Date.now() + 80 * hour).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-until-long', { value: 80 }));
        }).then(done, done);
      });
    });

    suite('days', function() {
      test('1 day ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() - 1 * day).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'days-ago-long', { value: 1 }));
        }).then(done, done);
      });

      test('5 days ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() - 5 * day).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'days-ago-long', { value: 5 }));
        }).then(done, done);
      });

      test('80 days ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() - 80 * day).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'days-ago-long', { value: 80 }));
        }).then(done, done);
      });

      test('in 1 day', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() + 1 * day).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'days-until-long', { value: 1 }));
        }).then(done, done);
      });

      test('in 5 days', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() + 5 * day).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'days-until-long', { value: 5 }));
        }).then(done, done);
      });

      test('in 80 days', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'day',
        });
        
        f.format(Date.now() + 80 * day).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'days-until-long', { value: 80 }));
        }).then(done, done);
      });
    });

    suite('weeks', function() {
      test('1 week ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() - 1 * week).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'weeks-ago-long', { value: 1 }));
        }).then(done, done);
      });

      test('5 weeks ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() - 5 * week).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'weeks-ago-long', { value: 5 }));
        }).then(done, done);
      });

      test('80 weeks ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() - 80 * week).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'weeks-ago-long', { value: 80 }));
        }).then(done, done);
      });

      test('in 1 week', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() + 1 * week).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'weeks-until-long', { value: 1 }));
        }).then(done, done);
      });

      test('in 5 weeks', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() + 5 * week).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'weeks-until-long', { value: 5 }));
        }).then(done, done);
      });

      test('in 80 weeks', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'week',
        });
        
        f.format(Date.now() + 80 * week).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'weeks-until-long', { value: 80 }));
        }).then(done, done);
      });
    });

    suite('months', function() {
      test('1 month ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() - 1 * month).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'months-ago-long', { value: 1 }));
        }).then(done, done);
      });

      test('5 months ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() - 5 * month).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'months-ago-long', { value: 5 }));
        }).then(done, done);
      });

      test('80 months ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() - 80 * month).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'months-ago-long', { value: 80 }));
        }).then(done, done);
      });

      test('in 1 month', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() + 1 * month).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'months-until-long', { value: 1 }));
        }).then(done, done);
      });

      test('in 5 months', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() + 5 * month).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'months-until-long', { value: 5 }));
        }).then(done, done);
      });

      test('in 80 months', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'month',
        });
        
        f.format(Date.now() + 80 * month).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'months-until-long', { value: 80 }));
        }).then(done, done);
      });
    });

    suite('years', function() {
      test('1 year ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() - 1 * year).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'years-ago-long', { value: 1 }));
        }).then(done, done);
      });

      test('5 years ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() - 5 * year).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'years-ago-long', { value: 5 }));
        }).then(done, done);
      });

      test('80 years ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() - 80 * year).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'years-ago-long', { value: 80 }));
        }).then(done, done);
      });

      test('in 1 year', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() + 1 * year).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'years-until-long', { value: 1 }));
        }).then(done, done);
      });

      test('in 5 years', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() + 5 * year).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'years-until-long', { value: 5 }));
        }).then(done, done);
      });

      test('in 80 years', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'year',
        });
        
        f.format(Date.now() + 80 * year).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'years-until-long', { value: 80 }));
        }).then(done, done);
      });
    });

    suite('bestFit', function() {
      test('1 hour ago', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit',
        });
        
        f.format(Date.now() - 1 * hour).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-ago-long', { value: 1 }));
        }).then(done, done);
      });

      test('in 1 hour', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit',
        });
        
        f.format(Date.now() + 1 * hour).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-until-long', { value: 1 }));
        }).then(done, done);
      });

      test('now', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit',
        });
        
        // mozIntl does not support seconds, Intl API will
        f.format(Date.now() + 0).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'minutes-until-long', { value: 0 }));
        }).then(done, done);
      });

      test('maximum value', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit',
        });
        
        f.format(Date.now() + 500 * year).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'years-until-long', { value: 500 }));
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

        f.format(Date.now() + ms).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-until-long', { value: 2 }));
        }).then(done, done);
      });

      test('1h59m59s300ms => in 2 hours with bestFit', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'hour',
        });
        
        // 1h59m59s300ms
        var ms = 1 * hour + 59 * min + 59 * sec + 300;

        f.format(Date.now() + ms).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-until-long', { value: 2 }));
        }).then(done, done);
      });

      test('should round ms+s if target token is minutes', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit'
        });

        f.format(Date.now() + 2 * min - 500).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'minutes-until-long', { value: 2 }));
        }).then(done, done);
      });

      test('should round ms+s+m if target token is hours', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit'
        });

        f.format(Date.now() + 2 * hour - 500).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'hours-until-long', { value: 2 }));
        }).then(done, done);
      });

      test('should bump the next token if almost there', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit'
        });

        f.format(Date.now() + 1 * week - 500).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'weeks-until-long', { value: 1 }));
        }).then(done, done);
      });

      test('should not bump the next token if there is none', function(done) {
        var f = new mozIntl.RelativeTimeFormat(navigator.languages, {
          unit: 'bestFit'
        });

        f.format(Date.now() + 1 * year - 500).then(() => {
          assert.isTrue(document.l10n.formatValue.calledOnce);
          assert.isTrue(document.l10n.formatValue.calledWith(
           'years-until-long', { value: 1 }));
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
        this.sinon.stub(document.l10n, 'formatValue', function(id, args) {
          return Promise.resolve({
            id: id,
            args: args
          });
        });
      });

      test('maxDiff is null', function(done) {
        var time = Date.now() - 86400 * 20 * 1000;
        var formatter = new mozIntl._gaia.RelativeDate(navigator.languages);
        formatter.format(time).then(result => {
          assert.ok(result.indexOf('/') !== -1);
        }).then(done, done);
      });

      test('maxDiff is specified', function(done) {
        var time = Date.now() - 86400 * 20 * 1000;
        var formatter = new mozIntl._gaia.RelativeDate(navigator.languages, {
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
        var formatter = new mozIntl._gaia.RelativeDate(navigator.languages);
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
        var formatter = new mozIntl._gaia.RelativeDate(navigator.languages, {
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
        var formatter = new mozIntl._gaia.RelativeDate(navigator.languages);
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
        var formatter = new mozIntl._gaia.RelativeDate(navigator.languages);
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
        var formatter = new mozIntl._gaia.RelativeDate(navigator.languages);
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
        var formatter = new mozIntl._gaia.RelativeDate(navigator.languages);
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

  suite('UnitFormat', function() {
    setup(function() {
      this.sinon.stub(document.l10n, 'formatValue',
        arg => Promise.resolve(arg));
    });

    function testUnit(group, unit, style) {
      var formatter = new mozIntl.UnitFormat(navigator.languages, {
        unit:  unit,
        style: style
      });
      return formatter.format(0).then(result => {
        assert.equal(result, `unitformat-${group}-${unit}-${style}`);
      });
    }

    test('uses correct unit group for durations', function(done) {
      var units = ['second', 'minute', 'hour', 'day', 'month'];

      var tests = units.map(unit => testUnit('duration', unit, 'narrow'));

      Promise.all(tests).then(() => done(), done);
    });

    test('uses correct unit group for digital', function(done) {
      var units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];

      var tests = [];

      for (let unit of units) {
        tests.push(testUnit('digital', unit, 'short'));
      }

      Promise.all(tests).then(() => done(), done);
    });

    test('throws range error for invalid unit', function() {
      assert.throws(() => {
        /*jshint unused:false*/
        let f = new mozIntl.UnitFormat(navigator.languages, {
          unit: 'foo'
        });
      }, RangeError);
    });

    test('throws range error for invalid style', function() {
      assert.throws(() => {
        /*jshint unused:false*/
        let f = new mozIntl.UnitFormat(navigator.languages, {
          unit: 'second',
          style: 'foo'
        });
      }, RangeError);
    });

    suite('bestFit', function() {
      suite('digital type', function() {
        test('should handle 0 bytes', function(done) {
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'digital',
            style: 'short'
          });

          f.format(0).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-digital-byte-short'));
          }).then(done, done);
        });

        test('should handle bytes', function(done) {
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'digital',
            style: 'short'
          });

          f.format(42).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-digital-byte-short'));
          }).then(done, done);
        });

        test('should handle kilobytes', function(done) {
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'digital',
            style: 'short'
          });

          f.format(1024).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-digital-kilobyte-short'));
          }).then(done, done);
        });

        test('should handle megabytes', function(done) {
          var v = 4901024;
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'digital',
            style: 'short'
          });

          f.format(v).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-digital-megabyte-short'));
          }).then(done, done);
        });

        test('should handle gigabytes', function(done) {
          var v = 4000901024;
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'digital',
            style: 'short'
          });

          f.format(v).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-digital-gigabyte-short'));
          }).then(done, done);
        });
      });

      suite('duration type', function() {
        test('should handle seconds', function(done) {
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'duration',
            style: 'narrow'
          });

          f.format(0).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-duration-second-narrow'));
          }).then(done, done);
        });

        test('should handle minutes', function(done) {
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'duration',
            style: 'narrow'
          });

          f.format(60).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-duration-minute-narrow'));
          }).then(done, done);
        });

        test('should handle hours', function(done) {
          var v = 60 * 60 * 4;
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'duration',
            style: 'narrow'
          });

          f.format(v).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-duration-hour-narrow'));
          }).then(done, done);
        });

        test('should handle days', function(done) {
          var v = 60 * 60 * 24 * 3;
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'duration',
            style: 'narrow'
          });

          f.format(v).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-duration-day-narrow'));
          }).then(done, done);
        });

        test('should handle months', function(done) {
          var v = 60 * 60 * 24 * 30 * 2;
          var f = new mozIntl.UnitFormat(navigator.languages, {
            unit:  'bestFit',
            type: 'duration',
            style: 'narrow'
          });

          f.format(v).then(val => {
            assert.equal(val,
              MockL10n._stringify('unitformat-duration-month-narrow'));
          }).then(done, done);
        });
      });
    });

    test('should handle undefined', function(done) {
      var f = new mozIntl.UnitFormat(navigator.languages, {
        unit:  'bestFit',
        type: 'duration',
        style: 'narrow'
      });

      f.format().then(val => {
        assert.isUndefined(val);
      }).then(done, done);
    });

    test('should handle NaN', function(done) {
      var f = new mozIntl.UnitFormat(navigator.languages, {
        unit:  'bestFit',
        type: 'duration',
        style: 'narrow'
      });

      f.format('NaN').then(val => {
        assert.isUndefined(val);
      }).then(done, done);
    });
  });
});
