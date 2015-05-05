define(function(require) {
'use strict';

requireCommon('test/synthetic_gestures.js');

var TimeHeader = require('views/time_header');
var View = require('view');
var core = require('core');

suite('Views.TimeHeader', function() {
  var subject;
  var controller;
  var date = new Date(2012, 0, 1);
  var localeFormat;
  var monthTitle;

  suiteSetup(function() {
    var fmt = navigator.mozL10n.DateTimeFormat();
    localeFormat = fmt.localeFormat;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="wrapper"></div>',
      '<gaia-header id="time-header" action="menu">',
        '<h1></h1>',
      '</gaia-header>'
    ].join('');

    document.body.appendChild(div);

    controller = core.timeController;

    subject = new TimeHeader();

    controller.move(date);
    monthTitle = localeFormat(
      date,
      '%b %Y'
    );
  });

  test('initialization', function() {
    assert.instanceOf(subject, View);
    assert.ok(subject.element);
    assert.equal(
      subject.element, document.querySelector('#time-header')
    );
  });

  test('#title', function() {
    assert.ok(subject.title);
  });

  test('#getScale', function() {
    var out = subject.getScale('month');
    assert.deepEqual(
      out,
      monthTitle
    );
  });

  test('#getScale for day', function() {
    controller.move(new Date(2012, 0, 30));
    var compare = localeFormat(new Date(2012, 0, 30), '%b %e, %A');
    var out = subject.getScale('day');
    assert.equal(out, compare);
    // 20 chars seems to be the maximum with current layout (see bug 951423)
    assert.operator(out.length, '<', 21,
      'header should not have too many chars');
  });

  test('#getScale for week', function() {
    controller.move(new Date(2012, 0, 15));
    var out = subject.getScale('week');
    var compare = localeFormat(new Date(2012, 0, 30), '%b %Y');
    assert.equal(out, compare);
  });

  // When week starts in one month and ends in another we need a special format
  test('#getScale for week - multiple months', function() {
    controller.move(new Date(2012, 0, 30));
    var out = subject.getScale('week');
    var compare = localeFormat(
      new Date(2012, 0, 30),
      '%b %Y'
    );
    compare += ' ' + localeFormat(
      new Date(2012, 1, 4),
      '%b %Y'
    );
    assert.equal(out, compare);
  });

  test('#getScale for week - month ending on Wednesday', function() {
    controller.move(new Date(2013, 6, 30));
    var out = subject.getScale('week');
    assert.equal(
      out,
      localeFormat(new Date(2013, 6, 28), '%b %Y') + ' ' +
      localeFormat(new Date(2013, 7, 3), '%b %Y')
    );
  });

  test('#_updateTitle', function() {
    subject._updateTitle();

    assert.equal(
      subject.title.dataset.date,
      controller.position.toString(),
      'sets element date'
    );

    assert.equal(
      subject.title.dataset.l10nDateFormat,
      subject.scales.month,
      'sets element scale'
    );

    assert.equal(
      subject.title.textContent,
      subject.getScale('month')
    );
  });

  suite('changing scales', function() {

    var calledWith;

    setup(function() {
      controller.move(date);
      controller.scale = 'year';

      subject._updateTitle = function() {
        calledWith = arguments;
      };
      // setup initial scale
      subject.render();
      calledWith = null;
    });

    test('initial change', function() {
      controller.move(new Date(
        date.getFullYear(),
        1
      ));

      assert.ok(!calledWith, 'dont re-render out of scale');
      controller.move(new Date(2020, 1));
      assert.ok(calledWith);
    });

    test('change scale', function() {
      controller.scale = 'month';
      assert.ok(calledWith);
      calledWith = null;

      controller.move(new Date(
        date.getFullYear(),
        date.getMonth() + 1
      ));

      assert.ok(calledWith);
    });
  });
});

});
