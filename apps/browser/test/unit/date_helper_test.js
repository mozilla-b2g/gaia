requireApp('browser/js/date_helper.js');

suite('Date Helper', function() {

  suite('started', function() {

    test('todayStarted', function() {
      var now = new Date();
      var todayStartedTimestamp = DateHelper.todayStarted();
      var todayStarted = new Date(todayStartedTimestamp);
      assert.equal(todayStarted.getFullYear(), now.getFullYear());
      assert.equal(todayStarted.getMonth(), now.getMonth());
      assert.equal(todayStarted.getDate(), now.getDate());
      assert.equal(todayStarted.getHours(), 0);
      assert.equal(todayStarted.getMinutes(), 0);
      assert.equal(todayStarted.getSeconds(), 0);
      assert.equal(todayStarted.getMilliseconds(), 0);

    });

    test('yesterdayStarted', function() {
      var now = new Date();
      var yesterdayStartedTimestamp = DateHelper.yesterdayStarted();
      var yesterdayStarted = new Date(yesterdayStartedTimestamp);
      assert.equal(true, yesterdayStartedTimestamp <= now.valueOf());
      assert.equal(yesterdayStarted.getHours(), 0);
      assert.equal(yesterdayStarted.getMinutes(), 0);
      assert.equal(yesterdayStarted.getSeconds(), 0);
      assert.equal(yesterdayStarted.getMilliseconds(), 0);

    });

    test('thisWeekStarted', function() {
      var now = new Date();
      var weekStartedTimestamp = DateHelper.thisWeekStarted();
      var weekStarted = new Date(weekStartedTimestamp);
      assert.equal(true, weekStartedTimestamp <= now.valueOf());
      assert.equal(weekStarted.getDay(), 1);
      assert.equal(weekStarted.getHours(), 0);
      assert.equal(weekStarted.getMinutes(), 0);
      assert.equal(weekStarted.getSeconds(), 0);
      assert.equal(weekStarted.getMilliseconds(), 0);
    });

    test('thisMonthStarted', function() {
      var now = new Date();
      var monthStartedTimestamp = DateHelper.thisMonthStarted();
      var monthStarted = new Date(monthStartedTimestamp);
      assert.equal(true, monthStartedTimestamp <= now.valueOf());
      assert.equal(monthStarted.getFullYear(), now.getFullYear());
      assert.equal(monthStarted.getMonth(), now.getMonth());
      assert.equal(monthStarted.getDate(), 1);
      assert.equal(monthStarted.getHours(), 0);
      assert.equal(monthStarted.getMinutes(), 0);
      assert.equal(monthStarted.getSeconds(), 0);
      assert.equal(monthStarted.getMilliseconds(), 0);
    });

    test('lastSixMonthsStarted', function() {
      var sixMonthsStarted = DateHelper.lastSixMonthsStarted();
      var now = new Date().valueOf();
      var delta = now - sixMonthsStarted;
      assert.equal(true, delta >= 2629743830 * 6);
      assert.equal(true, delta < 2629743830 * 7);
    });

    test('thisYearStarted', function() {
      var now = new Date();
      var yearStartedTimestamp = DateHelper.thisYearStarted();
      var yearStarted = new Date(yearStartedTimestamp);
      assert.equal(true, yearStartedTimestamp <= now.valueOf());
      assert.equal(yearStarted.getFullYear(), now.getFullYear());
      assert.equal(yearStarted.getMonth(), 0);
      assert.equal(yearStarted.getDate(), 1);
      assert.equal(yearStarted.getHours(), 0);
      assert.equal(yearStarted.getMinutes(), 0);
      assert.equal(yearStarted.getSeconds(), 0);
      assert.equal(yearStarted.getMilliseconds(), 0);
    });

  });

});
