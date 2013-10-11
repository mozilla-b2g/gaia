define(function(require) {

  'use strict';

  var Template = require('shared/js/template');
  var Utils = require('utils');
  var mozL10n = require('l10n');

  function Banner(node, tmplId) {
    // Accept a reference to an element or the element id
    if (typeof node === 'string') {
      this.notice = document.getElementById(node);
    } else {
      this.notice = node;
    }
    // Accept an optional reference to template element id
    this.tmpl = new Template(tmplId);
    // Store a reference to timeout to debounce banner
    this.timeout = null;
    return this;
  }

  Banner.prototype = {

    constructor: Banner,

    render: function bn_render(alarmTime) {
      var timeLeft, displayTime, tl, countdownType, localTimes, unitObj;

      timeLeft = +alarmTime - Date.now();
      // generate human readable numbers to pass to localization function
      tl = Utils.dateMath.fromMS(timeLeft, {
        unitsPartial: ['days', 'hours', 'minutes']
      });

      // Match properties to localizations string types
      // e.g. minutes maps to nMinutes if there are no hours but
      // nRemainMinutes if hours > 0
      if (tl.days) {
        //countdown-moreThanADay localized only for en-US while 913466 is open
        countdownType = 'countdown-moreThanADay';
        localTimes = [
          ['days', 'nRemainDays', tl.days],
          ['hours', 'nAndRemainHours', tl.hours]
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
      // e.g. {minutes: mozL10n.get('nMinutes', {n: 3})}
      unitObj = localTimes.reduce(function(lcl, time) {
        lcl[time[0]] = mozL10n.get(time[1], {n: time[2]});
        return lcl;
      }, {});

      // mozL10n.get interpolates the units in unitObj inside the
      // localization string for countdownType
      return mozL10n.get(countdownType, unitObj);
    },

    show: function bn_show(alarmTime) {
      // Render the Banner notice
      this.notice.innerHTML = this.tmpl.interpolate(
        {notice: this.render(alarmTime)},
        // Localization strings contain <strong> tags
        {safe: ['notice']}
      );
      // 'visible' class controls the animation
      this.notice.classList.add('visible');
      // use this object rather than a function to retain context
      this.notice.addEventListener('click', this);
      // Debounce timer in case alarms are added more quickly than 4 seconds
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      // After 4 seconds, remove the banner
      this.timeout = setTimeout(this.hide.bind(this), 4000);
    },

    hide: function bn_hide() {
      this.notice.classList.remove('visible');
      this.notice.removeEventListener('click', this);
    },

    handleEvent: function bn_handleEvent() {
      this.hide();
    }
  };

  return Banner;
});
