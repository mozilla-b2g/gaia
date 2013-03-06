requireLib('template.js');
requireLib('templates/alarm.js');

suiteGroup('Templates.Alarm', function() {
  var subject;

  suiteSetup(function() {
    subject = Calendar.Templates.Alarm;
  });

  function renderDescription(trigger) {
    return subject.description.render({
      trigger: trigger
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

    test('weeks', function() {
      // Large differences are specified in weeks
      assert.ok(
        /weeks/.test(renderDescription(-6000000))
      );
    });

    test('none', function() {
      assert.ok(
        /None/.test(renderDescription('none'))
      );
    });
  });

});
