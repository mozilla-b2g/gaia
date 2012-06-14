requireApp('calendar/js/template.js');
requireApp('calendar/js/templates/month.js');

suite('templates/month', function() {
  var subject;

  suiteSetup(function() {
    subject = Calendar.Templates.Month;
  });

  function a() {
    return '<a></a>';
  }

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('#busy', function() {
    var result = renderHTML('busy', 'busy-5');

    assert.ok(result);
    assert.include(result, 'busy-5');
  });

  test('#currentMonth', function() {
    var result = renderHTML('currentMonth', {
      month: 'January',
      year: '2012'
    });

    assert.ok(result);
    assert.include(result, 'January');
    assert.include(result, '2012');
  });

  test('#weekDaysHeader', function() {
    var result = renderHTML('weekDaysHeader', a());

    assert.ok(result);
    assert.include(result, '<a></a>');
  });

  test('#weekDaysHeaderDay', function() {
    var result = renderHTML('weekDaysHeaderDay', 'foo');

    assert.ok(result);
    assert.include(result, 'foo');
  });

  test('#month', function() {
    var result = renderHTML(
      'month', { id: 'myid', content: a() }
    );

    assert.ok(result);
    assert.include(result, 'myid');
    assert.include(result, '<a></a>');
  });

  test('#week', function() {
    var result = renderHTML(
      'week', a()
    );

    assert.ok(result);
    assert.include(result, '<a></a>');
  });

  test('#day', function() {
    var data = [];

    function add(item) {
      data.push(item);
      return item;
    }

    var result = renderHTML(
      'day', {
        id: add('idme'),
        dateString: add('dateStr'),
        state: add('active'),
        date: add('date1'),
        busy: a()
      }
    );

    assert.ok(result);

    data.forEach(function(item) {
      assert.include(result, item);
    });

  });

});
