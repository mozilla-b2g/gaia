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

  function setPath(path) {
    return function(ctx, next) {
      document.body.setAttribute('data-path', path);
      next();
    }
  }

  route.add('/', setPath('/month'), monthView, monthDayView);
  route.add('/month', setPath('/month'), monthView, monthDayView);

  //temp routes
  route.add('/day', setPath('/day'), new Calendar.View('#day-view'));
  route.add('/week', setPath('/week'), new Calendar.View('#week-view'));
  route.add('/add', setPath('/add'), new Calendar.View('#add-event-view'));

  route.start();

  //quick hack for today button
  var today = document.querySelector('#view-selector .today');

  today.addEventListener('click', function() {
    monthView.render();
    controller.setSelectedDay(new Date());
  });

};
