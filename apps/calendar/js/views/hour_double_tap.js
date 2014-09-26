/*global GestureDetector */
Calendar.ns('Views').HourDoubleTap = (function(){
'use strict';

// this will be replaced later for a better logic (see Bug 992728) but it was
// too much to do in a single patch, so for now we do a simple double tap
// without any visual feedback (similar to the old day view behavior)

var absoluteOffsetTop = Calendar.Utils.dom.absoluteOffsetTop;
var closest = Calendar.Utils.dom.closest;
var createDay = Calendar.Calc.createDay;
var QueryString = Calendar.QueryString;

function HourDoubleTap(options) {
  this.app = options.app;
  this.main = options.main;
  this.daysHolder = options.daysHolder;
  this.alldaysHolder = options.alldaysHolder;
  this.hourHeight = options.hourHeight;

  this._onDayDoubleTap = this._onDayDoubleTap.bind(this);
  this._onAllDayDoubleTap = this._onAllDayDoubleTap.bind(this);
}

HourDoubleTap.prototype = {

  _isActive: false,

  setup: function(){
    this._mainOffset = absoluteOffsetTop(this.main);

    this._hourGd = new GestureDetector(this.daysHolder);
    this._hourGd.startDetecting();
    this.daysHolder.addEventListener('dbltap', this._onDayDoubleTap);

    this._alldayGd = new GestureDetector(this.alldaysHolder);
    this._alldayGd.startDetecting();
    this.alldaysHolder.addEventListener('dbltap', this._onAllDayDoubleTap);
  },

  destroy: function() {
    this._hourGd.stopDetecting();
    this._alldayGd.stopDetecting();
    this.daysHolder.removeEventListener('dbltap', this._onDayDoubleTap);
    this.alldaysHolder.removeEventListener('dbltap', this._onAllDayDoubleTap);
  },

  _onDayDoubleTap: function(evt) {
    var target = evt.target;
    if (!target.classList.contains('day')) {
      return;
    }

    var y = evt.detail.clientY + this.main.scrollTop - this._mainOffset;
    var hour = Math.floor(y / this.hourHeight);
    var baseDate = new Date(target.dataset.date);

    this._addEvent({
      startDate: addHours(baseDate, hour).toString(),
      endDate: addHours(baseDate, hour + 1).toString()
    });
  },

  _onAllDayDoubleTap: function(evt) {
    var target = evt.target;
    if (!target.classList.contains('.allday-events')) {
      return;
    }

    var startDate = new Date(closest(target, '.allday').dataset.date);

    this._addEvent({
      isAllDay: true,
      startDate: startDate.toString(),
      endDate: createDay(startDate, startDate.getDate() + 1).toString()
    });
  },

  _addEvent: function(data) {
    // timeout is to avoid second click triggering the <select> inside
    // the ModifyEvent view (calendar/reminders/date/time)
    setTimeout(() => {
      this.app.go('/event/add/?' + QueryString.stringify(data));
    }, 50);
  }

};

function addHours(date, hourDiff) {
  var result = new Date(date);
  result.setHours(result.getHours() + hourDiff);
  return result;
}

return HourDoubleTap;
}());
