Calendar.init = function calendar_init() {

  var views = {},
      activeViews = [];

  var controller = new Calendar.Controller({
    eventList: new Calendar.Models.Events(),
    busytime: new Calendar.Models.Busytime()
  });

  function createView(name, obj) {
    var view;
    if (name in views) {
      view = views[name];
      view.onactive();
    } else {
      view = new Calendar.Views[name]({ controller: controller });
      view.render();
    }

    activeViews.push(view);
  }

  function clearViews() {
    var view;

    while (view = activeViews.pop()) {
      if ('oninactive' in view) {
        view.oninactive();
      }
    }
  }

  function showMonth(ctx, next) {
    createView('Month');
    createView('MonthsDay');

    next();
  }

  page('/', showMonth, clearViews);
  page('/month', showMonth, clearViews);

  page.start();

  //quick hack for today button
  var today = document.querySelector('#view-selector .today');

  today.addEventListener('click', function() {
    monthView.render();
    controller.setSelectedDay(new Date());
  });

};
