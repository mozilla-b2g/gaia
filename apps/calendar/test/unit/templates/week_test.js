suiteGroup('Templates.Week', function() {
  var subject;

  suiteSetup(function() {
    subject = Calendar.Templates.Week;
  });

  function a() {
    return '<a></a>';
  }

  test('#sidebarHour', function() {
    var result = subject.sidebarHour.render({
      hour: '5',
      displayHour: 'foo'
    });

    assert.ok(result);
    assert.include(result, 'hour-5');
    assert.include(result, 'foo');
  });

  test('#hour', function() {
    var hour = 'my-hour-5';
    var result = subject.hour.render({
      items: a(),
      hour: hour
    });

    assert.ok(hour, 'renders');
    assert.include(result, hour, 'has hour');
    assert.include(result, a(), 'has link');
  });

  test('#event', function() {
    var calId = 'calid';
    var busytimeId = 'busyid';
    var title = 'foo';

    var result = subject.event.render({
      calendarId: calId,
      busytimeId: busytimeId,
      title: title
    });

    assert.ok(result, 'has html');

    assert.include(result, calId, 'has calendarId');
    assert.include(result, busytimeId, 'has busytime id');
    assert.include(result, title, 'has title');
  });

  test('#header', function() {
    var result = subject.header.render('foo');
    assert.ok(result);
    assert.include(result, 'foo');
  });

  test('#frame', function() {
    var result = subject.frame.render();
    assert.ok(result);
  });

});


