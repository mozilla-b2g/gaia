suite('Banner', function() {
  'use strict';
  /* global MockIntlHelper, l10nAssert */
  var Banner;

  suiteSetup(function(done) {
    window.IntlHelper = MockIntlHelper;
    window.IntlHelper.define('digit-nopadding', 'number', {
      style: 'decimal',
      useGrouping: false
    });
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

    require(['banner/main'], function(banner) {
      Banner = banner;
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
    test('minutes ahead', function() {
      // build banner
      this.banner.show(this.minutes);

      // Check l10n arguments
      l10nAssert(this.banner.notice.querySelector('p'),
          'countdown_lessThanAnHour',
          {minutes: 12});
    });
    test('hours ahead', function() {
      // build banner
      this.banner.show(this.hours);

      // Check l10n arguments
      l10nAssert(this.banner.notice.querySelector('p'),
          'countdown_moreThanAnHour',
          {minutes: 12, hour: 10});
    });
    test('days ahead', function() {
      // build banner
      this.banner.show(this.days);

      // Check l10n arguments
      l10nAssert(this.banner.notice.querySelector('p'),
          'countdown_moreThanADay',
          {days: 2, hour: 10});
    });
  });

});
