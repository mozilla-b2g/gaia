requireLib('template.js');
requireLib('templates/alarm.js');

suiteGroup('Templates.Alarm', function() {
  'use strict';

  var subject;
  var app;

  suiteSetup(function() {
    app = testSupport.calendar.app();
    subject = Calendar.Templates.Alarm;
  });

  function renderOption(value, layout, selected) {
    return subject.option.render({
      value: value,
      layout: layout,
      selected: selected
    });
  }

  suite('#option', function() {
    test('minutes', function() {
      assert.include(renderOption(-600), 'minutes');
    });

    test('hours', function() {
      // One hour ago
      assert.include(renderOption(-6000), 'hour');
    });

    test('years', function() {
      // Large differences are specified in weeks
      assert.include(renderOption(-6000000), 'months');
    });

    test('none', function() {
      assert.include(renderOption('none'), 'None');
    });

    test('single unit rendered', function() {
      var option = renderOption(-5400);
      assert.include(option, '1 hour before');
      assert.include(option, 'data-l10n-id="hours-before"');
      assert.include(option, 'data-l10n-args=\'{"value":1}\'');
    });

    suite('selected', function() {
      test('> not selected', function() {
        assert.ok(
          renderOption(-1800).indexOf('selected') === -1,
          'not selected by default'
        );
      });

      test('> selected', function() {
        assert.include(renderOption(-1800, null, true), 'selected');
      });
    });

    suite('all day event alarms', function() {
      test('trigger include to system default\'s on day of event', function() {
        var option = renderOption(32400, 'allday');
        assert.include(option, 'On day of event');
        assert.include(option, 'data-l10n-id="alarm-at-event-allday"');
      });

      test('trigger include to 9 hours before event', function() {
        var option = renderOption(-32400, 'allday');
        assert.include(option, '9 hours before');
        assert.include(option, 'data-l10n-id="hours-before"');
        assert.include(option, 'data-l10n-args=\'{"value":9}\'');
      });

      test('trigger include to 1 day before', function() {
        var option = renderOption(-54000, 'allday');
        assert.include(option, '1 day before');
        assert.include(option, 'data-l10n-id="days-before"');
        assert.include(option, 'data-l10n-args=\'{"value":1}\'');
      });

      test('trigger include to 1 day after', function() {
        var option = renderOption(86400, 'allday');
        assert.include(option, '1 day after');
        assert.include(option, 'data-l10n-id="days-after"');
        assert.include(option, 'data-l10n-args=\'{"value":1}\'');
      });

      test('trigger include to 2 days before', function() {
        var option = renderOption(-140400, 'allday');
        assert.include(option, '2 days before');
        assert.include(option, 'data-l10n-id="days-before"');
        assert.include(option, 'data-l10n-args=\'{"value":2}\'');
      });

      test('trigger include to 1 week before', function() {
        var option = renderOption(-572400, 'allday');
        assert.include(option, '1 week before');
        assert.include(option, 'data-l10n-id="weeks-before"');
        assert.include(option, 'data-l10n-args=\'{"value":1}\'');
      });

      test('trigger include to 2 weeks before', function() {
        var option = renderOption(-1177200, 'allday');
        assert.include(option, '2 weeks before');
        assert.include(option, 'data-l10n-id="weeks-before"');
        assert.include(option, 'data-l10n-args=\'{"value":2}\'');
      });

      test('trigger include to 30 minutes', function() {
        var option = renderOption(-1800, 'allday');
        assert.include(option, '30 minutes before');
        assert.include(option, 'data-l10n-id="minutes-before"');
        assert.include(option, 'data-l10n-args=\'{"value":30}\'');
      });
    });
  });
});
