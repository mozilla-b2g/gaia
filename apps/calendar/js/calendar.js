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

  route.start();

  //quick hack for today button
  var today = document.querySelector('#view-selector .today');

  today.addEventListener('click', function() {
    monthView.render();
    controller.setSelectedDay(new Date());
  });

};
