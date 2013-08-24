requireApp('browser/js/utilities.js');

suite('URL Helper', function() {
  test('isNotURL => true', function() {
    [
      'data',
      'a ? b',
      'a . b ?',
      'what is mozilla',
      'what is mozilla?',
      'www.blah.com foo',
      'a?some b',
      'docshell site:mozilla.org',
      '?mozilla',
      '?site:mozilla.org docshell'
    ].forEach(function(input) {
      assert.ok(UrlHelper.isNotURL(input));
    });
  });

  test('isNotURL => false', function() {
    [
      'http://foo',
      'blerg.co.uk',
      'blach.com',
      'www.blah.com',
      'a:80',
      'a?',
      'a?b',
      'http://foo.com',
      'data:about'
    ].forEach(function(input) {
      assert.ok(!UrlHelper.isNotURL(input));
    });
  });
});

suite('Date Helper', function() {

  function assertMidnight(date) {
    assert.equal(date.getHours(), 0);
    assert.equal(date.getMinutes(), 0);
    assert.equal(date.getSeconds(), 0);
    assert.equal(date.getMilliseconds(), 0);
  };

  suite('started', function() {

    test('todayStarted', function() {
      var now = new Date();
      var todayStartedTimestamp = DateHelper.todayStarted();
      var todayStarted = new Date(todayStartedTimestamp);
      assert.equal(todayStarted.getFullYear(), now.getFullYear());
      assert.equal(todayStarted.getMonth(), now.getMonth());
      assert.equal(todayStarted.getDate(), now.getDate());
      assertMidnight(todayStarted);
    });

    test('yesterdayStarted', function() {
      var now = new Date();
      var yesterdayStartedTimestamp = DateHelper.yesterdayStarted();
      var yesterdayStarted = new Date(yesterdayStartedTimestamp);
      assert.equal(true, yesterdayStartedTimestamp <= now.valueOf());
      assertMidnight(yesterdayStarted);

    });

    test('thisWeekStarted', function() {
      var now = new Date();
      var weekStartedTimestamp = DateHelper.thisWeekStarted();
      var weekStarted = new Date(weekStartedTimestamp);
      assert.equal(true, weekStartedTimestamp <= now.valueOf());
      assert.equal(weekStarted.getDay(), 0);
      assertMidnight(weekStarted);
    });

    test('thisMonthStarted', function() {
      var now = new Date();
      var monthStartedTimestamp = DateHelper.thisMonthStarted();
      var monthStarted = new Date(monthStartedTimestamp);
      assert.equal(true, monthStartedTimestamp <= now.valueOf());
      assert.equal(monthStarted.getFullYear(), now.getFullYear());
      assert.equal(monthStarted.getMonth(), now.getMonth());
      assert.equal(monthStarted.getDate(), 1);
      assertMidnight(monthStarted);
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
      assertMidnight(yearStarted);
    });

  });

});

suite('HTML Helper', function() {

  test('createHighlightHTML', function() {
    var result = HtmlHelper.createHighlightHTML('abc', 'b');
    assert.equal(result, 'a<span class="highlight">b</span>c');
  });

});
