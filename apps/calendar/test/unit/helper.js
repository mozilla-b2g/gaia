function requireCalendarController() {
  requireApp('calendar/js/template.js');
  requireApp('calendar/js/format.js');
  requireApp('calendar/js/responder.js');
  requireApp('calendar/js/models/busytime.js');
  requireApp('calendar/js/models/events.js');
  requireApp('calendar/js/calc.js');
  requireApp('calendar/js/controller.js');
}

function createController(fn) {
  var busytime = new Calendar.Models.Busytime();
  var events = new Calendar.Models.Events();

  var controller = new Calendar.Controller({
    eventList: events,
    busytime: busytime
  });

  return controller;
}
