requireApp('clock/js/stopwatch.js');
requireApp('clock/js/utils.js');

requireApp('clock/test/unit/mocks/mock_navigator_mozl10n.js');

// http://www.reddit.com/r/mildlyinteresting/comments/1l4224/i_started_the_stopwatch_when_i_got_my_iphone_3/

suite('Stopwatch', function() {
  var nml;
  var id = 1;
  var sw;

  suiteSetup(function() {
    nml = navigator.mozL10n;
    navigator.mozL10n = MockmozL10n;

    loadBodyHTML('/index.html');

    // The timestamp for "Tue Jul 16 2013 06:00:00" according to the local
    // system's time zone
    this.sixAm = 1373954400000 + (new Date()).getTimezoneOffset() * 60 * 1000;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nml;
  });

  setup(function() {
    sw = new Stopwatch();
  })

  suite.only('start', function() {

    setup(function() {
      this.clock = this.sinon.useFakeTimers(this.sixAm);
    });

    teardown(function() {
      this.clock.restore();
    });

    test('start and elapse 1 hr', function() {
      sw.start();
      this.clock.tick(1 * 60 * 60 * 1000);
      assert.equal(sw.startTime + sw.getElapsedTime(),
        this.sixAm + 1 * 60 * 60 * 1000);
    });

  });

  /*suite('stop', function() {

    setup(function() {
      this.clock = this.sinon.useFakeTimers(this.sixAm);
    });

    teardown(function() {
      this.clock.restore();
    });

    test('stop stops the stopwatch', function() {
    });

  });*/

  
});
