'use strict';

require('/shared/js/l10n.js');
require('/shared/js/l10n_date.js');
//mocha.setup({globals: ['jsCount', 'totalResult']});

suite('l10n date', function(done) {

  var l10nDate;

  suiteSetup(function() {
    l10nDate = navigator.mozL10n.DateTimeFormat();
  });

  suite('LocaleFormat', function() {
    test('%x format', function() {
      var result = l10nDate.localeFormat(new Date(), '%x');
      assert.ok(/\d+\/\d+\/\d+/.test(result));
    });

    test('should handle 12 PM correctly', function() {
      var date = new Date();
      date.setHours(12);
      var result = l10nDate.localeFormat(date, '%p');
      assert.strictEqual(result, 'PM');
    });
  });

  suite('relativeParts', function() {
    test('negative minutes', function() {
      var result = l10nDate.relativeParts(-50 * 60);
      assert.deepEqual(result, {minutes: 50});
    });

    test('multiple values', function() {
      var result = l10nDate.relativeParts(2 * 61 * 60);
      assert.deepEqual(result, {hours: 2, minutes: 2});
    });

    test('round low values to minutes', function() {
      var result = l10nDate.relativeParts(20);
      assert.deepEqual(result, {minutes: 0});

      var result2 = l10nDate.relativeParts(30);
      assert.deepEqual(result2, {minutes: 1});
    });
  });

  suite('prettyDate', function() {
    test('maxDiff is null', function() {
      var time = Date.now() - 86400 * 20 * 1000;
      var result = l10nDate.fromNow(time);
      assert.ok(result.indexOf('/') !== -1);
    });

    test('maxDiff is specified', function() {
      var time = Date.now() - 86400 * 20 * 1000;
      var result = l10nDate.fromNow(time, false, (86400 * 21));

      assert.ok(result.indexOf('/') === -1);
      assert.equal(result, '2 weeks ago');
    });

    test('useCompactFormat is null', function() {
      var time = Date.now() - 86400 * 5 * 1000;
      var result = l10nDate.fromNow(time);

      assert.equal(result, '5 days ago');
    });

    test('useCompactFormat is true', function() {
      var time = Date.now() - 86400 * 5 * 1000;
      var result = l10nDate.fromNow(time, true);

      assert.equal(result, '5d ago');
    });

    test('now', function() {
      var time = Date.now() - 29 * 1000;
      var result = l10nDate.fromNow(time);
      assert.equal(result, 'just now');

      time = Date.now() + 29 * 1000;
      result = l10nDate.fromNow(time);
      assert.equal(result, 'now');
    });

    test('in a minute', function() {
      var time = Date.now() + 35 * 1000;
      var result = l10nDate.fromNow(time);
      assert.equal(result, 'in a minute');

      time = Date.now() + 1.8 * 60 * 1000;
      result = l10nDate.fromNow(time);
      assert.equal(result, 'in a minute');
    });

    test('should discard ms if diff is over 1 minute', function() {
      var time = Date.now() + 2 * 60 * 1000 - 500;
      var result = l10nDate.fromNow(time);
      assert.equal(result, 'in 2 minutes');

      time = Date.now() + 2 * 60 * 60 * 1000 - 500;
      result = l10nDate.fromNow(time);
      assert.equal(result, 'in 2 hours');
    });
  });

});
