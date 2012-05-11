(function(window) {
  var controller = new Calendar.Controller({
    events: new Calendar.Models.Events(),
    busytime: new Calendar.Models.Busytime()
  });

  var view = new Calendar.Views.Month({
    controller: controller
  });

  var busy = controller.busytime;

  busy.add(new Date(2012, 4, 11, 5), '1');
  busy.add(new Date(2012, 4, 12, 1), '2');
  busy.add(new Date(2012, 4, 14, 10), '3');
  busy.add(new Date(2012, 4, 15, 12), '4');

  view.render();

  //quick hack for today button

  var today = document.querySelector('#view-selector .today');

  today.addEventListener('click', function() {
    view.render();
    view.setSelectedDay(new Date());
  });
}(this));
