'use strict';
/* global DeveloperHUD */

require('/js/devtools/developer_hud.js');

suite('developerHUD', function() {

  var subject;

  setup(function() {
    subject = new DeveloperHUD();
  });

  function updateMetrics(metrics) {
    var target = document.getElementById('target');
    var doc = target.document || target.ownerDocument || target;
    var event = doc.createEvent('CustomEvent');
    event.initCustomEvent('developer-hud-update', true, true,
      { metrics: metrics });
    target.dispatchEvent(event);
  }

  function getDeveloperHUD() {
    var iframe = document.getElementById('target');
    var appwindow = iframe.parentElement;
    return appwindow.querySelector('.developer-hud');
  }

  suite('display()', function() {

    setup(function() {
      document.body.innerHTML = '<div><iframe id=target></iframe></div>';
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('show one widget', function() {
      updateMetrics([
        {name: 'bugs', value: 42}
      ]);
      var view = getDeveloperHUD();
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
      var view = getDeveloperHUD();
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
      assert.isNull(getDeveloperHUD());
    });

  });

});
