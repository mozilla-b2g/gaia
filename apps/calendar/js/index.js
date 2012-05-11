(function(window) {
  var controller = new Calendar.Controller({
    eventList: new Calendar.Models.Events(),
    busytime: new Calendar.Models.Busytime()
  });

  var monthView = new Calendar.Views.Month({
    controller: controller
  });

  var dayView = new Calendar.Views.Day({
    controller: controller
  });

  var demoIndex = 0;

  function demoAdd(day, hour) {
    demoIndex++;
    busy.add(new Date(2012, 4, day, hour), demoIndex);

    events.add(
      new Date(2012, 4, day, hour),
      demoIndex,
      {
        name: 'Calendar Demo',
        location: 'Qualcomm',
        attendees: ['James Lal', 'Frank Lee']
      }
    );

  }

  var busy = controller.busytime;
  var events = controller.eventList;

  busy.add(new Date(2012, 4, 11, 10), '1');

  events.add(
    new Date(2012, 4, 11, 10),
    '1',
    {
      name: 'Calendar Demo',
      location: 'Qualcomm',
      attendees: ['James Lal', 'Frank Lee']
    }
  );

  busy.add(new Date(2012, 4, 11, 16), '2');

  events.add(
    new Date(2012, 4, 11, 16),
    '2',
    {
      name: 'Escape via Southwest Airlines',
      location: 'San Diego Airport',
      attendees: ['James Lal']
    }
  );

  busy.add(new Date(2012, 4, 11, 20), '3');

  events.add(
    new Date(2012, 4, 11, 20),
    '3',
    {
      name: 'Get Indian /w wife',
      location: 'San Jose - Indian Place',
      attendees: ['James Lal', 'Sarah Lal']
    }
  );


  busy.add(new Date(2012, 4, 14, 20), '4');

  events.add(
    new Date(2012, 4, 14, 20),
    '4',
    {
      name: 'Get Indian /w wife',
      location: 'San Jose - Indian Place',
      attendees: ['James Lal', 'Sarah Lal']
    }
  );

  busy.add(new Date(2012, 4, 14, 22), '5');

  events.add(
    new Date(2012, 4, 14, 22),
    '5',
    {
      name: 'Get Indian /w wife',
      location: 'San Jose - Indian Place',
      attendees: ['James Lal', 'Sarah Lal']
    }
  );

  busy.add(new Date(2012, 4, 15, 1), '6');

  events.add(
    new Date(2012, 4, 15, 1),
    '6',
    {
      name: 'Get Indian /w wife',
      location: 'San Jose - Indian Place',
      attendees: ['James Lal', 'Sarah Lal']
    }
  );

  demoAdd(5, 2);
  demoAdd(5, 4);
  demoAdd(5, 6);

  demoAdd(22, 2);
  demoAdd(22, 4);
  demoAdd(22, 6);
  demoAdd(22, 8);
  demoAdd(22, 10);
  demoAdd(22, 12);
  demoAdd(22, 14);
  demoAdd(22, 16);
  demoAdd(22, 18);
  demoAdd(22, 20);
  demoAdd(22, 22);
  demoAdd(22, 23);
  demoAdd(22, 24);
  demoAdd(22, 24);
  demoAdd(22, 26);
  demoAdd(22, 28);



  var i = 0;

  for (i=10; i < 20; i++) {
    demoAdd(i, Math.floor(Math.random() * 10));
    demoAdd(i, Math.floor(Math.random() * 10));
    demoAdd(i, Math.floor(Math.random() * 10));
    demoAdd(i, Math.floor(Math.random() * 10));
    demoAdd(i, Math.floor(Math.random() * 10));
  }


  var i = 1;

  for (i = 1; i < 60; i++) {
    demoAdd(20, i + 1);
  }



  monthView.render();
  dayView.render();

  //quick hack for today button

  var today = document.querySelector('#view-selector .today');

  today.addEventListener('click', function() {
    monthView.render();
    controller.setSelectedDay(new Date());
  });

}(this));
