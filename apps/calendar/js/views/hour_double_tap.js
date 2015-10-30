define(function(require, exports, module) {
'use strict';

// this will be replaced later for a better logic (see Bug 992728) but it was
// too much to do in a single patch, so for now we do a simple double tap
// without any visual feedback (similar to the old day view behavior)

var QueryString = require('querystring');
var absoluteOffsetTop = require('utils/dom').absoluteOffsetTop;
var closest = require('utils/dom').closest;
var createDay = require('common/calc').createDay;

function HourDoubleTap(options) {
  this.main = options.main;
  this.daysHolder = options.daysHolder;
  this.alldaysHolder = options.alldaysHolder;
  this.hourHeight = options.hourHeight;

  this._onDayTap = this._onDayTap.bind(this);
  this._onAllDayTap = this._onAllDayTap.bind(this);
  this.removeAddEventLink = this.removeAddEventLink.bind(this);
}
module.exports = HourDoubleTap;

HourDoubleTap.prototype = {

  _isActive: false,

  _addEventLink: null,

  setup: function() {
    this._mainOffset = absoluteOffsetTop(this.main);
    this.daysHolder.addEventListener('click', this._onDayTap);
    this.alldaysHolder.addEventListener('click', this._onAllDayTap);
  },

  destroy: function() {
    this.removeAddEventLink();
    this.daysHolder.removeEventListener('click', this._onDayTap);
    this.alldaysHolder.removeEventListener('click', this._onAllDayTap);
  },

  /**
   * If the event target is an existing event, the method finds whether the tap
   * was _really_ on the existing event, to account for possible event
   * retargeting that's not desirable in that case.
   *
   * @param {MouseEvent} evt This is the event to check.
   * @returns {Boolean} True if we tapped on a child of a day.
   */
  _isEventRightOnEventLink(evt) {
    var target = evt.target;
    if (!target.classList.contains('md__day')) {
      // Could be aggressive event fuzzing registering a tap on an existing
      // event or the "add event" UI, where the tap is really below that item.
      // See bug 1210201.

      // In this case, offsetY is the vertical space between the top of the
      // target element and the actual tap, so if the tap is bigger than the
      // height of the element, or smaller than 0, the tap really happened out
      // of the element.
      var tappedOnExistingEvent =
        // intentionally keeping retargeting behavior for the `add` button.
        target.classList.contains('md__add-event') ||
        target.classList.contains('md__event') &&
        evt.offsetY >= 0 &&
        evt.offsetY <= target.getBoundingClientRect().height;

      if (tappedOnExistingEvent) {
        return true;
      }
    }

    return false;
  },

  _onDayTap: function(evt) {
    if (this._isEventRightOnEventLink(evt)) {
      return;
    } else {
      // Having this in the `else` block is a hint to the reader that we could
      // remove it if the event retargeting gets smarter and we don't need this
      // `if` anymore.

      // It works because the event handler for the <a> is actually on `window`
      // and checks if the event was defaultPrevented. Check js/ext/page.js.

      // Until Bug 1091889 gets fixed we'll still get the :active
      // styles because they're being applied with `touchstart` and we can't
      // defaultPrevent this event without breaking everything.
      evt.preventDefault();
    }

    var target = evt.target.closest('.md__day');

    var y = evt.clientY + this.main.scrollTop - this._mainOffset;
    var hour = Math.floor(y / this.hourHeight);
    var baseDate = new Date(target.dataset.date);

    this._onTap(target, {
      startDate: addHours(baseDate, hour).toString(),
      endDate: addHours(baseDate, hour + 1).toString()
    }, hour);
  },

  _onAllDayTap: function(evt) {
    var target = evt.target;
    if (!target.classList.contains('md__allday-events')) {
      return;
    }

    var startDate = new Date(closest(target, '.md__allday').dataset.date);

    this._onTap(target, {
      isAllDay: true,
      startDate: startDate.toString(),
      endDate: createDay(startDate, startDate.getDate() + 1).toString()
    }, null, evt.mozInputSource);
  },

  _onTap: function(container, data, hour, source) {
    hour = hour || 0;

    if (this._addEventLink) {
      this.removeAddEventLink();
      return;
    }

    var link = document.createElement('a');
    link.href = '/event/add/?' + QueryString.stringify(data);
    link.className = 'md__add-event gaia-icon icon-newadd';
    link.dataset.l10nId = 'multi-day-new-event-link';
    link.style.top = (hour * this.hourHeight) + 'px';
    link.style.opacity = 0;

    link.addEventListener('click', this.removeAddEventLink);

    container.appendChild(link);
    this._addEventLink = link;

    // Initiated by a screen reader on double tap.
    if (source === 0) {
      link.click();
      return;
    }

    // opacity will trigger transition, needs to happen after nextTick
    setTimeout(() => {
      this._addEventLink && (this._addEventLink.style.opacity = 1);
    });
  },

  removeAddEventLink: function() {
    var link = this._addEventLink;
    if (!link) {
      return;
    }

    link.removeEventListener('click', this.removeAddEventLink);

    link.addEventListener('transitionend', function onTransitionEnd() {
      link.removeEventListener('transitionend', onTransitionEnd);
      link.parentNode && link.parentNode.removeChild(link);
    });
    link.style.opacity = 0;

    this._addEventLink = null;
  }

};

function addHours(date, hourDiff) {
  var result = new Date(date);
  result.setHours(result.getHours() + hourDiff);
  return result;
}

});
