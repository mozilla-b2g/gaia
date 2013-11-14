suite('Banner', function() {
  var Banner, mozL10n;

  suiteSetup(function(done) {
    // store timezone offset for fake timers
    var offset = (new Date(2013, 5, 16, 6)).getTimezoneOffset() * 60 * 1000;

    // The timestamp for "Tue Jul 16 2013 06:00:00" according to the local
    // system's time zone
    this.sixAm = new Date(2013, 5, 16, 6).getTime();

    // +12 minutes +20 seconds
    this.minutes = this.sixAm + 740000;

    // +10 hours +12 minutes +20 seconds
    this.hours = this.minutes + (10 * 60 * 60 * 1000);

    // +2 day +10 hours +12 minutes +20 seconds
    this.days = this.hours + (48 * 60 * 60 * 1000);

    // Instantiate the Banner once with an element
    this.noteElem = document.createElement('div');

    testRequire(['banner', 'mocks/mock_shared/js/l10n'],
      function(banner, mockL10n) {
      Banner = banner;
      mozL10n = MockL10n;

      this.banner = new Banner(this.noteElem);

      done();
    }.bind(this));
  });

  setup(function() {
    this.clock = this.sinon.useFakeTimers(this.sixAm);
  });

  suite('#show', function() {
    test('should make notification visible ', function() {
      var visible;

      this.banner.show(this.hours);
      visible = this.noteElem.className.split(/\s+/).some(function(elem) {
        return elem === 'visible';
      });
      assert.ok(visible);
    });
  });

  suite('#render', function() {
    setup(function() {
      this._ = this.sinon.spy(mozL10n, 'get');
    });
    test('minutes ahead', function() {
      // build banner
      this.banner.render(this.minutes);

      // Check l10n arguments
      assert.deepEqual(this._.args[0], [
        'nMinutes', {n: 12}
      ], 'call to get minutes first');
      assert.deepEqual(this._.args[1], [
        'countdown-lessThanAnHour', {
          minutes: 'nMinutes{"n":12}'
        }
      ], 'call to get countdown text');
    });
    test('hours ahead', function() {
      // build banner
      this.banner.render(this.hours);

      // Check l10n arguments
      assert.deepEqual(this._.args[0], [
        'nHours', {n: 10}
      ], 'call to get hours first');
      assert.deepEqual(this._.args[1], [
        'nRemainMinutes', {n: 12}
      ], 'call to get minutes second');
      assert.deepEqual(this._.args[2], [
        'countdown-moreThanAnHour', {
          hours: 'nHours{"n":10}', minutes: 'nRemainMinutes{"n":12}'
        }
      ], 'call to get countdown text');
    });
    test('days ahead', function() {
      // build banner
      this.banner.render(this.days);

      // Check l10n arguments
      assert.deepEqual(this._.args[0], [
        'nRemainDays', {n: 2}
      ], 'call to get days first');
      assert.deepEqual(this._.args[1], [
        'nAndRemainHours', {n: 10}
      ], 'call to get hours second');
      assert.deepEqual(this._.args[2], [
        'countdown-moreThanADay', {
          days: 'nRemainDays{"n":2}', hours: 'nAndRemainHours{"n":10}'
        }
      ], 'call to get countdown text');
    });
  });

});
