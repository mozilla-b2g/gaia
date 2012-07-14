Calendar.init = function calendar_init() {
  var Views = Calendar.Views;
  var Store = Calendar.Store;

  var route = new Calendar.Router(page);

  var controller = new Calendar.Controller({
    eventList: new Store.Event(),
    busytime: new Store.Busytime()
  });

  var monthView = new Views.Month({ controller: controller });
  var monthDayView = new Views.MonthsDay({ controller: controller });
  var settings = new Views.Settings({ controller: controller });
  var createAccount = new Views.CreateAccount({ controller: controller });

  function setPath(data, next) {
    document.body.setAttribute('data-path', data.canonicalPath);
    next();
  }

  route.state('/month/', setPath, monthView, monthDayView);
  route.state('/create-account/', setPath, createAccount);

  route.modifier('/settings/', setPath, settings,
                 settings.showCalendars.bind(settings));

  route.modifier('/settings/accounts/', setPath, settings,
                 settings.showAccounts.bind(settings));

  //temp routes
  route.state('/day/', setPath, new Calendar.View('#day-view'));
  route.state('/week/', setPath, new Calendar.View('#week-view'));
  route.state('/add/', setPath, new Calendar.View('#add-event-view'));

  if (window.location.pathname === '/') {
    page.replace('/month/');
  }

  // quick hack for today button
  var today = document.querySelector('#view-selector .today');

  today.addEventListener('click', function() {
    monthView.render();
    controller.setSelectedDay(new Date());
  });

  route.start();
};
