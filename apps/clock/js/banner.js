(function(exports) {
  'use strict';
  var bannerTimer;
   /**
   * Constructor function to create a new Banner notification instance
   *
   * @param {Number|Date} alarmTime Number or Date object indicating the time
   *                                the next alarm will fire
   * @return {String} displayTime Localized relative time to be passed to
   *                              Banner.show()
   */
  function Banner(alarmTime) {
    var _, timeLeft, displayTime, tl, countdownType, localTimes, unitObj;
    // Alias localization here to allow for unit tests
    _ = navigator.mozL10n.get;

    // generate human readable numbers to pass to localization function
    // Get hours and minutes from alarm
    timeLeft = +alarmTime - Date.now();
    tl = Utils.dateMath.fromMS(timeLeft, {
      unitsPartial: ['days', 'hours', 'minutes']
    });

    // Match properties to localizations string types
    // e.g. minutes maps to nMinutes if there are no hours but
    // nRemainMinutes if hours > 0
    if (tl.days) {
      //countdown-moreThanADay is localized only for en-US while 913466 is open
      countdownType = 'countdown-moreThanADay';
      localTimes = [
        ['days', 'nRemainDays', tl.days],
        ['hours', 'nRemainHours', tl.hours]
      ];
    } else if (tl.hours > 0) {
      countdownType = 'countdown-moreThanAnHour';
      localTimes = [
        ['hours', 'nHours', tl.hours],
        ['minutes', 'nRemainMinutes', tl.minutes]
      ];
    } else {
      countdownType = 'countdown-lessThanAnHour';
      localTimes = [
        ['minutes', 'nMinutes', tl.minutes]
      ];
    }

    // Create an object to pass to mozL10n.get
    // e.g. {minutes: _('nMinutes', {n: 3})}
    unitObj = localTimes.reduce(function(lcl, time) {
      lcl[time[0]] = _(time[1], {n: time[2]});
      return lcl;
    }, {});

    // mozL10n.get interpolates the units in unitObj inside the
    // localization string for countdownType
    displayTime = _(countdownType, unitObj);

    // make banner, add visibility and kick off timer
    this.notice = document.getElementById('banner-countdown');
    // use this object rather than a function to retain context
    this.notice.addEventListener('click', this);
    this.show(displayTime);
  }
  // with an object passed to the event handler it looks for
  // a handleEvent method
  Banner.prototype.handleEvent = function() {
    this.hide();
  };

  Banner.prototype.show = function(time) {
    var tmpl;
    tmpl = new Template(this.notice);
    // Clock localization files contain HTML used in shared notification styles
    // which makes breaking out individual elements problematic
    this.notice.innerHTML = tmpl.interpolate(
      {notice: time},
      // Localization strings contain strong tags
      { safe: ['notice'] }
    );
    // 'visible' class controls the animation
    this.notice.classList.add('visible');
    // Debounce timer in case alarms are added more quickly than 4 seconds
    if (bannerTimer) {
      clearTimeout(bannerTimer);
    }
    // After 4 seconds, remove the banner
    bannerTimer = setTimeout(this.hide.bind(this), 4000);
    return this;
  };

  Banner.prototype.hide = function() {
    this.notice.classList.remove('visible');
    this.notice.removeEventListener('click', this);
  };

  exports.Banner = Banner;
}(this));
