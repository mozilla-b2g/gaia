requireLib('template.js');
requireLib('templates/alarm.js');

suiteGroup('Templates.Alarm', function() {
  var subject;

  suiteSetup(function() {
    subject = Calendar.Templates.Alarm;
  });

  function renderDescription(trigger, layout) {
    return subject.description.render({
      trigger: trigger,
      layout: layout
    });
  }

  suite('#description', function() {
    test('minutes', function() {
      assert.ok(
        /minutes/.test(renderDescription(-600))
      );
    });

    test('hours', function() {
      // One hour ago
      assert.ok(
        /hour/.test(renderDescription(-6000))
      );
    });

    test('years', function() {
      // Large differences are specified in weeks
      assert.ok(
        /months/.test(renderDescription(-6000000))
      );
    });

    test('none', function() {
      assert.ok(
        /None/.test(renderDescription('none'))
      );
    });

    test('single unit rendered', function() {
      assert.equal(
        '1 hour before', renderDescription(-5400)
      );
    });
  });

  suite('#all day event alarms', function() {
    test('trigger equal to system default\'s on day of event', function() {
      assert.equal('On day of event', renderDescription(32400, 'allday'));
    });

    test('trigger equal to 9 hours before event', function() {
      assert.equal('9 hours before', renderDescription(-32400, 'allday'));
    });

    test('trigger equal to 1 day before', function() {
      assert.equal('1 day before', renderDescription(-54000, 'allday'));
    });

    test('trigger equal to 1 day after', function() {
      assert.equal('1 day after', renderDescription(86400, 'allday'));
    });

    test('trigger equal to 2 days before', function() {
      assert.equal('2 days before', renderDescription(-140400, 'allday'));
    });

    test('trigger equal to 1 week before', function() {
      assert.equal('1 week before', renderDescription(-572400, 'allday'));
    });

    test('trigger equal to 2 weeks before', function() {
      assert.equal('2 weeks before', renderDescription(-1177200, 'allday'));
    });

    test('trigger equal to 30 minutes', function() {
      assert.equal('30 minutes before', renderDescription(-1800, 'allday'));
    });

  });

});
