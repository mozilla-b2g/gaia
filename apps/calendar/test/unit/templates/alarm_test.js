define(function(require) {
'use strict';
/* global MockMozIntl */

require('/shared/test/unit/mocks/mock_moz_intl.js');

var Alarm = require('templates/alarm');

suite('Templates.Alarm', function() {
  var subject;

  suiteSetup(function() {
    window.mozIntl = MockMozIntl;
    subject = Alarm;
  });

  function renderOption(value, layout, selected) {
    return subject.option.render({
      value: value,
      layout: layout,
      selected: selected
    });
  }

  function renderDescription(layout, trigger) {
    return subject.description.render({
      layout: layout,
      trigger: trigger
    });
  }

  suite('description', function() {
    test('minutes', function() {
      var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
      renderDescription('allday', -600);
      assert.isTrue(relativePartSpy.withArgs(-600 * 1000).calledOnce);
      window.mozIntl._gaia.relativePart.restore();

      assert.include(renderDescription('allday', -600), 'role="listitem"');
      assert.include(renderDescription('standard', -600), 'role="listitem"');
    });

    test('hours', function() {
      var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
      renderDescription('allday', -6000);
      assert.isTrue(relativePartSpy.withArgs(-6000 * 1000).calledOnce);
      window.mozIntl._gaia.relativePart.restore();

      assert.include(renderDescription('allday', -6000), 'role="listitem"');
      assert.include(renderDescription('standard', -6000), 'role="listitem"');
    });

    test('years', function() {
      var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
      renderDescription('allday', -6000000);
      assert.isTrue(relativePartSpy.withArgs(-6000000 * 1000).calledOnce);
      window.mozIntl._gaia.relativePart.restore();

      assert.include(renderDescription('allday', -6000000), 'role="listitem"');
      assert.include(renderDescription('standard', -6000000),
        'role="listitem"');
    });

    test('none', function() {
      assert.include(renderDescription('allday', 'none'), 'None');
      assert.include(renderDescription('allday', 'none'), 'role="listitem"');
      assert.include(renderDescription('standard', 'none'), 'role="listitem"');
    });
  });

  suite('#option', function() {
    test('minutes', function() {
      var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
      renderOption(-600);
      assert.isTrue(relativePartSpy.withArgs(-600 * 1000).calledOnce);
      window.mozIntl._gaia.relativePart.restore();
    });

    test('hours', function() {
      // One hour ago
      var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
      renderOption(-6000);
      assert.isTrue(relativePartSpy.withArgs(-6000 * 1000).calledOnce);
      window.mozIntl._gaia.relativePart.restore();
    });

    test('years', function() {
      // Large differences are specified in weeks
      var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
      renderOption(-6000000);
      assert.isTrue(relativePartSpy.withArgs(-6000000 * 1000).calledOnce);
      window.mozIntl._gaia.relativePart.restore();
    });

    test('none', function() {
      assert.include(renderOption('none'), 'None');
    });

    test('single unit rendered', function() {
      var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
      renderOption(-5400);
      assert.isTrue(relativePartSpy.withArgs(-5400 * 1000).calledOnce);
      window.mozIntl._gaia.relativePart.restore();
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
        var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
        renderOption(-32400, 'allday');
        assert.isTrue(relativePartSpy.withArgs(-32400 * 1000).calledOnce);
        window.mozIntl._gaia.relativePart.restore();
      });

      test('trigger include to 1 day before', function() {
        var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
        renderOption(-54000, 'allday');
        assert.isTrue(relativePartSpy.withArgs(-86400000).calledOnce);
        window.mozIntl._gaia.relativePart.restore();
      });

      test('trigger include to 1 day after', function() {
        var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
        renderOption(86400, 'allday');
        assert.isTrue(relativePartSpy.withArgs(86400 * 1000).calledOnce);
        window.mozIntl._gaia.relativePart.restore();
      });

      test('trigger include to 2 days before', function() {
        var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
        renderOption(-140400, 'allday');
        assert.isTrue(relativePartSpy.withArgs(-172800000).calledOnce);
        window.mozIntl._gaia.relativePart.restore();
      });

      test('trigger include to 1 week before', function() {
        var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
        renderOption(-572400, 'allday');
        assert.isTrue(relativePartSpy.withArgs(-604800000).calledOnce);
        window.mozIntl._gaia.relativePart.restore();
      });

      test('trigger include to 2 weeks before', function() {
        var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
        renderOption(-1177200, 'allday');
        assert.isTrue(relativePartSpy.withArgs(-1209600000).calledOnce);
        window.mozIntl._gaia.relativePart.restore();
      });

      test('trigger include to 30 minutes', function() {
        var relativePartSpy = sinon.spy(window.mozIntl._gaia, 'relativePart');
        renderOption(-1800, 'allday');
        assert.isTrue(relativePartSpy.withArgs(-1800 * 1000).calledOnce);
        window.mozIntl._gaia.relativePart.restore();
      });
    });
  });
});

});
