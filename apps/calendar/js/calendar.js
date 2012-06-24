Calendar.init = function calendar_init() {
  var Views = Calendar.Views;
  var Models = Calendar.Models;

  var route = new Calendar.Router(page);

  var controller = new Calendar.Controller({
    eventList: new Models.Events(),
    busytime: new Models.Busytime()
  });

  var monthView = new Views.Month({ controller: controller });
  var monthDayView = new Views.MonthsDay({ controller: controller });

  route.add('/', monthView, monthDayView);
  route.add('/month', monthView, monthDayView);

  //temp routes
  route.add('/day', new Calendar.View('#day-view'));
  route.add('/week', new Calendar.View('#week-view'));
  route.add('/add', new Calendar.View('#add-event-view'));

  route.start();

  //quick hack for today button
  var today = document.querySelector('#view-selector .today');

  today.addEventListener('click', function() {
    monthView.render();
    controller.setSelectedDay(new Date());
  });

};
