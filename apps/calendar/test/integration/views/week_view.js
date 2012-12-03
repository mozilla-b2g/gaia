function WeekView() {
  DayView.apply(this, arguments);
}

WeekView.prototype = {
  __proto__: DayView.prototype,

  viewSelector: 'weekView',
  url: '/week/'
};
