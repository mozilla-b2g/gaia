(function(window) {
  var controller = new Calendar.Controller({
    eventList: new Calendar.Models.Events(),
    busytime: new Calendar.Models.Busytime()
  });

  var monthView = new Calendar.Views.Month({
    controller: controller
  });

  var dayView = new Calendar.Views.MonthsDay({
    controller: controller
  });

  monthView.render();
  dayView.render();

  //quick hack for today button

  var today = document.querySelector('#view-selector .today');

  today.addEventListener('click', function() {
    monthView.render();
    controller.setSelectedDay(new Date());
  });

}(this));
