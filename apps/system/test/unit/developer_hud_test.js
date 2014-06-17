'use strict';
/* global MocksHelper, DeveloperHUD */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
require('/js/devtools/developer_hud.js');

var mocksForDeveloperHUD = new MocksHelper([
  'SettingsListener'
]).init();


suite('developerHUD', function() {

  var subject;

  mocksForDeveloperHUD.attachTestHelpers();
  setup(function() {
    subject = new DeveloperHUD().start();
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

    function getCanvasFor(widgets) {
      var canvas = document.createElement('canvas');
      canvas.classList.add('widgets');
      canvas.width = window.innerWidth;
      canvas.height = 30;
      document.body.appendChild(canvas);

      var ctx = canvas.getContext('2d');
      ctx.font = '18px sans-serif';
      ctx.textBaseline = 'top';

      ctx.save();

      // Widgets are positioned starting from the right side of the screen.
      ctx.translate(canvas.width, 0);

      widgets.forEach(function(widget) {
        // The size of a widget is comprise between 30px and the size of its
        // content. There is also an additional padding of 5px on each side.
        var textWidth = ctx.measureText(widget.value).width;
        var widgetWidth = Math.max(30, textWidth) + (5 * 2);

        // Position the widget relatively to the last position on the left
        // of the screen.
        ctx.translate(-widgetWidth, 0);

        // Fill widget background-color.
        ctx.fillStyle = widget.color;
        ctx.fillRect(0, 0, widgetWidth, canvas.height);

        // Draw widget text centered both horizontally and vertically.
        ctx.fillStyle = 'white';
        ctx.fillText(widget.value,
                     (widgetWidth - textWidth) / 2,
                     canvas.height / 4);
      });

      ctx.restore();

      return canvas;
    }

    test('show widgets', function() {
      updateMetrics([
        {name: 'bugs', value: 42}
      ]);
      var view = getDeveloperHUD();
      assert.isDefined(view);
      var widgets = view.querySelector('.widgets');
      assert.isDefined(widgets);
    });

    test('show simple widgets', function() {
      var metrics = [
        {name: 'errors', value: 23},
        {name: 'warnings', value: 16},
        {name: 'security', value: 1},
        {name: 'reflows', value: 4},
      ];

      updateMetrics(metrics);
      var view = getDeveloperHUD();
      assert.isDefined(view);

      var canvas = view.querySelector('canvas');
      var referenceCanvas = getCanvasFor([
        { 'color': 'red', 'value': '23'},
        { 'color': 'orange', 'value': '16'},
        { 'color': 'black', 'value': '1'},
        { 'color': 'purple', 'value': '4'},
      ]);
      assert.equal(canvas.toDataURL(),
                   referenceCanvas.toDataURL());
    });

    test('show ms widgets', function() {
      var metrics = [
        {name: 'jank', value: 100},
      ];

      updateMetrics(metrics);
      var view = getDeveloperHUD();
      assert.isDefined(view);

      var canvas = view.querySelector('canvas');
      var referenceCanvas = getCanvasFor([
        { 'color': 'cornflowerblue', 'value': '100ms'},
      ]);
      assert.equal(canvas.toDataURL(),
                   referenceCanvas.toDataURL());
    });

    test('show memory widgets', function() {
      var prefix = ['','K','M','G','T','P','E','Z','Y'];

      for (var i = 0; i < prefix.length; i++) {
        var value = 1.1 * Math.pow(1024, i);
        var metrics = [
          {'name': 'uss', 'value': value},
          {'name': 'memory', 'value': value},
        ];

        updateMetrics(metrics);
        var view = getDeveloperHUD();
        assert.isDefined(view);

        var canvas = view.querySelector('canvas');

        while (value > 1024) {
          value /= 1024;
        }
        var referenceValue =
          (Math.round(value * 100) / 100) + ' ' + prefix[i] + 'B';
        var referenceCanvas = getCanvasFor([
          { 'color': 'dimgrey', 'value': referenceValue },
          { 'color': 'lightslategrey', 'value': referenceValue },
        ]);
        assert.equal(canvas.toDataURL(),
                     referenceCanvas.toDataURL());
      }
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
