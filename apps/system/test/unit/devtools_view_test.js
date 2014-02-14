'use strict';
/* global DevtoolsView */

require('/js/devtools_view.js');

suite('devtoolsWidgetPanel', function() {

  var manifest = 'app://fakeapp.gaiamobile.org/fake.html';
  var subject;

  setup(function() {
    subject = new DevtoolsView();
  });

  function updateMetrics(metrics) {
    var data = {
      detail: {manifestURL: manifest, metrics: metrics}
    };
    var evt = new CustomEvent('widget-panel-update', data);
    window.dispatchEvent(evt);
  }

  function getWidgetView() {
    var iframe = document.querySelector('iframe[mozapp="' + manifest + '"]');
    var appwindow = iframe.parentElement;
    return appwindow.querySelector('.devtools-view');
  }

  suite('display()', function() {

    setup(function() {
      document.body.innerHTML = '<div><iframe mozapp="' + manifest +
        '"></iframe></div>';
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('show one widget', function() {
      updateMetrics([
        {name: 'bugs', value: 42}
      ]);
      var view = getWidgetView();
      assert.isDefined(view);
      var widget = view.querySelector('.widget');
      assert.isDefined(widget);
      assert.equal(widget.textContent, '42');
    });

    test('show two widgets', function() {
      updateMetrics([
        {name: 'errors', value: 23},
        {name: 'warnings', value: 16}
      ]);
      var view = getWidgetView();
      assert.isDefined(view);
      var widgets = view.querySelectorAll('.widget');
      assert.equal(widgets.length, 2);
    });

    test('show widgets and tear down', function() {
      updateMetrics([
        {name: 'explosions', value: 15},
        {name: 'armageddon', value: 8},
        {name: 'chaos', value: 4}
      ]);
      updateMetrics();
      assert.isNull(getWidgetView());
    });

  });

});
