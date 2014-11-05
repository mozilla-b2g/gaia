/* global Formatting, Toolkit, MockMozL10n */

'use strict';

requireApp('costcontrol/test/unit/mock_moz_l10n.js');
requireApp('costcontrol/js/utils/toolkit.js');
requireApp('costcontrol/js/utils/formatting.js');

var realMozL10n;

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

suite('Formatting Test Suite >', function() {

  suiteSetup(function() {
    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;
  });

  function assertSmartRound(roundedValue, value, unit) {
    assert.equal(roundedValue[0], value);
    assert.equal(roundedValue[1], unit);
  }

  function assertRoundData(roundedValue, value, unit) {
    assert.equal(roundedValue[0], value);
    assert.equal(roundedValue[1], unit);
  }

  function createDOMForTesting() {
    var markup =
    '<section id="testing-formatTimeHTML">' +
    '<div id="only-date1"></div>' +
    '<div id="only-date2"></div>' +
    '<div id="both-dates"></div>' +
    '<div id="both-dates-changed"></div>' +
    '<div id="same-dates"></div>' +
    '</section>';

    document.body.innerHTML = markup;
  }

  test(
    'Get decimal positions test behaviour without delta argument.',
    function() {
      var getPositions = Formatting.getPositions;
      assert.isTrue(getPositions(1.345) === 2);
      assert.isTrue(getPositions(1.3) === 2);
      assert.isTrue(getPositions(1) === 0);
      assert.isTrue(getPositions(97) === 0);
      assert.isTrue(getPositions(99.34) === 1);
      assert.isTrue(getPositions(103.39) === 0);
      assert.isTrue(getPositions(1021.3) === 0);
    }
  );

  test(
    'Get decimal positions test behaviour with delta argument.',
    function() {
      var getPositions = Formatting.getPositions;
      // Positive
      assert.isTrue(getPositions(1.345, 1) === 3);
      assert.isTrue(getPositions(1.3, 1) === 3);
      assert.isTrue(getPositions(1, 1) === 0);
      assert.isTrue(getPositions(99.34, 1) === 2);
      assert.isTrue(getPositions(103.39, 1) === 0);
      // Negative
      assert.isTrue(getPositions(1.345, -1) === 1);
      assert.isTrue(getPositions(1.3, -1) === 1);
      assert.isTrue(getPositions(1, -1) === 0);
      assert.isTrue(getPositions(99.34, -1) === 0);
      assert.isTrue(getPositions(103.39, -1) === 0);
    }
  );

  test(
    'SmartRound() test behaviour without delta argument.',
    function() {
      var f = Formatting;

      assert.equal(assertSmartRound(f.smartRound(1.345), 1.34, 'B'));
      assert.equal(assertSmartRound(f.smartRound(1.3), 1.30, 'B'));
      assert.equal(assertSmartRound(f.smartRound(1), 1, 'B'));
      assert.equal(assertSmartRound(f.smartRound(97), 97, 'B'));
      assert.equal(assertSmartRound(f.smartRound(99.34), 99.3, 'B'));
      assert.equal(assertSmartRound(f.smartRound(103.39), 103, 'B'));
      assert.equal(assertSmartRound(f.smartRound(1021.8), 1.02, 'KB'));
      assert.equal(assertSmartRound(f.smartRound(3431021.8), 3.43, 'MB'));
      assert.equal(assertSmartRound(f.smartRound(3431021000.8), 3.43, 'GB'));
    }
  );

  test(
    'SmartRound() test behaviour with delta argument.',
    function() {
      var f = Formatting;
      // Positive
      assert.equal(assertSmartRound(f.smartRound(1.349, 1), 1.349, 'B'));
      assert.equal(assertSmartRound(f.smartRound(1.3, 1), 1.300, 'B'));
      assert.equal(assertSmartRound(f.smartRound(1, 1), 1, 'B'));
      assert.equal(assertSmartRound(f.smartRound(99.34, 1), 99.34, 'B'));
      assert.equal(assertSmartRound(f.smartRound(103.39, 1), 103, 'B'));
      // Negative
      assert.equal(assertSmartRound(f.smartRound(1.345, -1), 1.3, 'B'));
      assert.equal(assertSmartRound(f.smartRound(1, -1), 1, 'B'));
      assert.equal(assertSmartRound(f.smartRound(99.34, -1), 99, 'B'));
      assert.equal(assertSmartRound(f.smartRound(103.39, -1), 103, 'B'));
    }
  );

  test(
    'roundData() test behaviour.',
    function() {
      var f = Formatting;

      assert.equal(assertRoundData(f.roundData(1.349, 1), 1.3, 'B'));
      assert.equal(assertRoundData(f.roundData(1.3, 2), 1.30, 'B'));
      assert.equal(assertRoundData(f.roundData(1, 2), 1, 'B'));
      assert.equal(assertRoundData(f.roundData(97, 2), 97, 'B'));
      assert.equal(assertRoundData(f.roundData(99.346, 2), 99.35, 'B'));
      assert.equal(assertRoundData(f.roundData(103.39, 1), 103.4, 'B'));
      assert.equal(assertRoundData(f.roundData(1021.8, 2), 1.02, 'KB'));
      assert.equal(assertRoundData(f.roundData(3431021.8, 2), 3.43, 'MB'));
      assert.equal(assertRoundData(f.roundData(8431021000.8, 2), 8.43, 'GB'));
    }
  );

  test(
    'formatTime() test behaviour.',
    function() {
      var originalMozHour12 = window.navigator.mozHour12;

      var f = Formatting;
      var today = Toolkit.toMidnight(new Date());
      var MINUTE = 60 * 1000;

      var yesterday = Toolkit.toMidnight(new Date(today.getTime() - MINUTE));
      var oneTuesday = Toolkit.toMidnight(new Date(2014, 1, 25));
      // As navigator.mozl10n.DateTimeFormat is a constructor, it is not
      // possible to put an spy on its method localeFormat. For this reason,
      // the spy must be placed into the Mock, instead of in the real method.
      var dateSpy = this.sinon.spy(MockMozL10n.DateTimeFormat.prototype,
                        'localeFormat');

      assert.equal(f.formatTime(), 'never');
      f.formatTime(oneTuesday, '%a');
      assert.ok(dateSpy.calledWith(oneTuesday, '%a'));
      // formatTime method does not call localeFormat method when the formatted
      // date is yesterday or today, in that case, uses location tags.
      assert.ok(f.formatTime(today).contains('today'));
      assert.ok(f.formatTime(yesterday).contains('yesterday, '));

      dateSpy.reset();
      window.navigator.mozHour12 = true;
      f.formatTime(oneTuesday);
      assert.ok(dateSpy.calledTwice);
      assert.ok(dateSpy.calledWith(oneTuesday, '%a'));
      assert.ok(dateSpy.calledWith(oneTuesday,  'shortTimeFormat12'));

      dateSpy.reset();
      window.navigator.mozHour12 = false;
      f.formatTime(oneTuesday);
      assert.ok(dateSpy.calledTwice);
      assert.ok(dateSpy.calledWith(oneTuesday, '%a'));
      assert.ok(dateSpy.calledWith(oneTuesday,  'shortTimeFormat24'));

      dateSpy.restore();
      window.navigator.mozHour12 = originalMozHour12;
    }
  );

  test(
    'formatData() test behaviour.',
    function() {
      var data = [25, 'MB'];

      assert.equal(Formatting.formatData(['x']), '');
      assert.equal(Formatting.formatData(data), '25 MB');
    }
  );

  test(
    'formatTimeSinceNow() test behaviour.',
    function() {
      var originalMozHour12 = window.navigator.mozHour12;
      var f = Formatting;
      var now = new Date();
      var MINUTE = 60 * 1000;
      var HOUR = 60 * MINUTE;
      var oneTuesday = Toolkit.toMidnight(new Date(2014, 1, 25));
      var aFewMinutesAgo = new Date(now.getTime() - 25 * MINUTE);
      var aFewHoursAgo = new Date(now.getTime() - 15 * HOUR);

      assert.equal(f.formatTimeSinceNow(now), 'just now');
      assert.equal(f.formatTimeSinceNow(aFewMinutesAgo), '25m ago');
      assert.equal(f.formatTimeSinceNow(aFewHoursAgo), '15h ago');
      // As navigator.mozl10n.DateTimeFormat is a constructor, it is not
      // possible to put an spy on its method localeFormat. For this reason,
      // the spy must be placed into the Mock, instead of in the real method.
      var dateSpy = this.sinon.spy(MockMozL10n.DateTimeFormat.prototype,
                                   'localeFormat');
      window.navigator.mozHour12 = true;
      f.formatTimeSinceNow(oneTuesday);
      assert.ok(dateSpy.calledTwice);
      assert.ok(dateSpy.calledWith(oneTuesday, '%a'));
      assert.ok(dateSpy.calledWith(oneTuesday,  'shortTimeFormat12'));

      dateSpy.reset();
      window.navigator.mozHour12 = false;
      f.formatTimeSinceNow(oneTuesday);
      assert.ok(dateSpy.calledTwice);
      assert.ok(dateSpy.calledWith(oneTuesday, '%a'));
      assert.ok(dateSpy.calledWith(oneTuesday,  'shortTimeFormat24'));

      dateSpy.restore();
      window.navigator.mozHour12 = originalMozHour12;
    }
  );

  test(
    'computeTelephonyMinutes() test behaviour.',
    function() {
      var f = Formatting;
      // Less than one minute
      var activity = { calltime: 100 };
      assert.ok(f.computeTelephonyMinutes(activity) === 1);

      // One minute
      activity = { calltime: 60000 };
      assert.ok(f.computeTelephonyMinutes(activity) === 1);

    // One minute and one second
      activity = { calltime: 60001 };
      assert.ok(f.computeTelephonyMinutes(activity) > 1);
    }
  );

  test(
    'formatTimeHTML() test behaviour.',
    function() {
      var DAY = 24 * 60 * 60 * 1000;
      var date1 = new Date(2014, 1, 25);
      var date2 = new Date(date1.getTime() + (DAY * 5));
      var body = document.body.innerHTML;
      createDOMForTesting();

      function assertformatTimeHTML(htmlId, initialDate, finalDate) {
        var fragment = document.getElementById(htmlId);
        fragment.appendChild(Formatting.formatTimeHTML(initialDate, finalDate));
        var timeElement = fragment.getElementsByTagName('time');
        if (finalDate && (initialDate !== finalDate)) {
          assert.equal(timeElement[1].innerHTML,
                       Formatting.formatTime(finalDate));
          assert.equal(timeElement[0].innerHTML,
                       Formatting.formatTime(initialDate, 'short-date-format'));
        } else {
          assert.equal(timeElement[0].innerHTML,
                       Formatting.formatTime(initialDate));
        }
      }

      assertformatTimeHTML('only-date1', date1);
      assertformatTimeHTML('only-date2', date2);
      assertformatTimeHTML('both-dates', date1, date2);
      assertformatTimeHTML('both-dates-changed', date2, date1);
      assertformatTimeHTML('same-dates', date2, date2);

      document.body.innerHTML = body;
    }
  );
});
