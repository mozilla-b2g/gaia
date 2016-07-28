'use strict';

var View = require('./view');

function Week() {
  View.apply(this, arguments);
}
module.exports = Week;

Week.prototype = {
  __proto__: View.prototype,

  selector: '#week-view',

  get sideBarHours() {
    return this.findElements('.md__sidebar .md__hour .md__display-hour');
  },

  get events() {
    return this.findElements('.md__event');
  },

  get addEventButton() {
    return this.findElement('.md__add-event');
  },

  get todayDates() {
    return this.findElements('.md__sticky .md__allday h1.is-today');
  },

  get dayNames() {
    return this.findElements('.md__day-name').map(function(el) {
      return el.text();
    });
  },

  get daysHolder() {
    return this.findElement('.md__days');
  },

  get days() {
    return this.findElements('.md__day');
  },

  get hours() {
    return this.findElements('.md__hour');
  },

  get currentTime() {
    return this.findElement('.md__current-time');
  },

  get currentHour() {
    var now = new Date();
    return this.findElement('.md__hour-'+ now.getHours());
  },

  get currentDisplayHour() {
    return this.currentHour.findElement('.md__display-hour');
  },

  get main() {
    return this.findElement('.md__main');
  },

  get allDayIcon() {
    return this.findElement('.md__all-day');
  },

  get activeAllDays() {
    return this.findElements('.md__allday[aria-hidden="false"]');
  },

  get allDaysHolder() {
    return this.findElement('.md__alldays');
  },

  get scrollTop() {
    return this.main.scriptWith(function(el) {
      return el.scrollTop;
    });
  },

  /**
   * This method tries to find out where the hour square is located in the
   * window.
   *
   * @param {Number} hour The hour to locate.
   * @returns {Number} 0 if it's displayed, or the delta otherwise: negative
   * if it's above or positive if it's below.
   */
  _getDeltaToFullyDisplayHour: function(hour) {
    var hourElt = this.hours[hour];
    var mainScroll = this.scrollTop;
    var hourOffset = hourElt.scriptWith(function(el) { return el.offsetTop; });
    var mainClientHeight = this.main.rect().height;
    var hourHeight = hourElt.rect().height;

    if (hourOffset < mainScroll) {
      return hourOffset - mainScroll;
    }

    var bottomHourOffset = hourOffset + hourHeight;
    var bottomScroll = mainScroll + mainClientHeight;
    if (bottomHourOffset > bottomScroll) {
      return bottomHourOffset - bottomScroll;
    }
    return 0;
  },

  /**
   * This method waits until we don't scroll.
   *
   * Note this doesn't seem to work properly when the view is just displayed.
   * That's why waitForHourScrollEnd is still useful.
   */
  waitForNoScroll: function() {
    var prevScrollTop = null;
    this.client.waitFor(function() {
      var currentScrollTop = this.scrollTop;
      if (prevScrollTop !== null && prevScrollTop === currentScrollTop) {
        return true;
      }
      prevScrollTop = currentScrollTop;
      return false;
    }.bind(this));
  },

  /**
   * This method uses just the right amount of flicking to scroll page by page
   * until finding the right hour line.
   *
   * @param {Number} hour The hour to scroll to.
   */
  scrollToHour: function(hour) {
    var mainRect = this.main.rect();
    var middleOfMain = mainRect.width / 2;

    this.client.waitFor(function() {
      this.waitForNoScroll();

      var delta = this._getDeltaToFullyDisplayHour(hour);
      if (delta === 0) {
        return true;
      }

      var moveDelta = mainRect.height / 4;
      var beginPosition = 10;

      // element is hidden above the visible part
      // we need to move it up
      if (delta < 0) {
        this.actions.flick(
          this.main,
          middleOfMain, beginPosition, middleOfMain, beginPosition + moveDelta
        ).perform();
      }
      // element is hidden below the visible part.
      // we need to move it down
      if (delta > 0) {
        this.actions.flick(
          this.main,
          middleOfMain, beginPosition + moveDelta, middleOfMain, beginPosition
        ).perform();
      }

      return false;
    }.bind(this));
  },

  /**
   * Tap the right square. This might throw if the square is not visible, so you
   * should use scrollToHour before calling this method.
   *
   * @param {Object} options
   * @param {Number} options.day The day to tap. This needs to be a visible day.
   * @param {Number} options.hour The hour to tap. It needs to be visible as
   * well.
   * @param {Number} [options.left] If present, it allows to tap at a specific
   * location in the square. It can be negative to tap at the left of the
   * button. Only one of `left`, `right` can be specified.
   * @param {Number} [options.right] If present, it allows to tap at a specific
   * location in the square. It can be negative to tap at the right of the
   * button.
   * @param {Number} [options.top] If present, it allows to tap at a specific
   * location in the square. It can be negative to tap at the top of the
   * button. Only one of `top`, `bottom` can be spcified.
   * @param {Number} [options.bottom] If present, it allows to tap at a specific
   * location in the square. It can be negative to tap at the bottom of the
   * button.
   */
  tapDayHour: function(options) {
    var day = options.day;
    var hour = options.hour;
    var left = options.left;
    var right = options.right;
    var bottom = options.bottom;
    var top = options.top;

    var dayElt = this.days[day];
    var hourElt = this.hours[hour];
    var dayEltRect = dayElt.rect();
    var hourEltRect = hourElt.rect();

    if (left === undefined && right === undefined) {
      left = dayEltRect.width / 2;
    }

    if (left === undefined) {
      left = dayEltRect.width - right;
    }

    if (top === undefined && bottom === undefined) {
      top = hourEltRect.height / 2;
    }

    if (top === undefined) {
      top = hourEltRect.height - bottom;
    }

    top += hourEltRect.height * hour;

    dayElt.tap(left, top);
  },

  isShowingAddEventLink: function() {
    return this.element.scriptWith(function(el) {
      return !!el.querySelector('.md__add-event');
    });
  },

  waitForHourScrollEnd: function(hour) {
    // if displaying current day it scrolls to current time, if not it scrolls
    // to 8AM; it should also scroll to the created event, that's why we allow
    // overriding the `hour`.
    if (hour == null) {
      hour = this.todayDates.length ?
        Math.max(new Date().getHours() - 1, 0) :
        8;
    }
    var expected = this.getDestinationScrollTop(hour);
    this._waitForScrollEnd(expected);
  },

  _waitForScrollEnd: function(expected) {
    this.client.waitFor(function() {
      return this.scrollTop === expected;
    }.bind(this));
    this.client.waitFor(function() {
      return this.main.cssProperty('overflowY') !== 'hidden';
    }.bind(this));
  },

  getDestinationScrollTop: function(hour) {
    hour = Math.max(hour, 0);
    var bottomScrollTop = this.main.scriptWith(function(el) {
      return el.scrollHeight - el.clientHeight;
    });
    var hourOffsetTop = this.hours[hour].scriptWith(function(el) {
      return el.offsetTop;
    });
    return Math.min(hourOffsetTop, bottomScrollTop);
  },

  scrollToTop: function() {
    this.scrollToHour(0);
  }
};
