'use strict';
/* global LayoutEditor */

requireApp('homescreen-stingray/js/vendor/evt.js');
requireApp('homescreen-stingray/js/layout_editor.js');

suite('LayoutEditor', function() {
  var widgetView;

  suiteSetup(function() {
    widgetView = document.createElement('div');
    widgetView.style.width = '1280px';
    widgetView.style.height = '800px';
    document.body.appendChild(widgetView);
  });

  suiteTeardown(function() {
    document.body.removeChild(widgetView);
  });

  // test init function and its other private functions called by init
  suite('init', function() {
    setup(function() {
      widgetView.innerHTML = '';
    });

    teardown(function() {
    });

    test('init 1x1', function() {
      var editor = new LayoutEditor({
        layout: { vertical: 1, horizontal: 1 },
        holders: [{ left: 0, top: 0, width: 1, height: 1 }]
      });
      editor.init(widgetView,
                  { width: 1280, height: 800, left: 0, top: 0 });
      assert.isDefined(editor.placeHolders[0]);
      assert.equal(editor.placeHolders[0].left, 10);
      assert.equal(editor.placeHolders[0].top, 10);
      assert.equal(editor.placeHolders[0].width, 1260);
      assert.equal(editor.placeHolders[0].height, 780);
      assert.equal(editor.placeHolders.length, 1);
    });

    test('init 3x3', function() {
      var editor = new LayoutEditor({
        gap: { vertical: 0, horizontal: 0 },
        layout: { vertical: 3, horizontal: 3 },
        holders: [{ left: 0, top: 0, width: 1, height: 1 },
                  { left: 1, top: 0, width: 1, height: 1 },
                  { left: 2, top: 0, width: 1, height: 1 },
                  { left: 0, top: 1, width: 1, height: 1 },
                  { left: 1, top: 1, width: 1, height: 1 },
                  { left: 2, top: 1, width: 1, height: 1 },
                  { left: 0, top: 2, width: 1, height: 1 },
                  { left: 1, top: 2, width: 1, height: 1 },
                  { left: 2, top: 2, width: 1, height: 1 }]
      });
      editor.init(widgetView, { width: 1280, height: 800, left: 0, top: 0 });
      assert.equal(editor.placeHolders.length, 9);
      for (var i = 0; i < editor.placeHolders.length; i++) {
        assert.equal(editor.placeHolders[i].width, 420);
        assert.equal(editor.placeHolders[i].height, 260);
      }
    });

    test('init with scale', function() {
      var editor = new LayoutEditor({
        padding: { top: 0, bottom: 0, right: 0, left: 0 },
        gap: { vertical: 0, horizontal: 0 },
        layout: { vertical: 1, horizontal: 1 },
        holders: [{ static: true, left: 0, top: 0, width: 1, height: 1 }]
      });
      // the target size is 640x480, scale ratio should be 0.5
      editor.init(widgetView,
                  { width: 640, height: 400, left: 0, top: 0 });
      assert.equal(editor.scaleRatio, 0.5);
      // all UI element are still shown as 1280x800 in editor.
      assert.equal(editor.placeHolders[0].width, 1280);
      assert.equal(editor.placeHolders[0].height, 800);
      assert.equal(editor.placeHolders[0].elm.style.left, '0px');
      assert.equal(editor.placeHolders[0].elm.style.top, '0px');
      assert.equal(editor.placeHolders[0].elm.style.width, '1280px');
      assert.equal(editor.placeHolders[0].elm.style.height, '800px');
      // the exported config is fit to 640x400
      var config = editor.exportConfig();
      assert.equal(config[0].rect.left, 0);
      assert.equal(config[0].rect.top, 0);
      assert.equal(config[0].rect.width, 640);
      assert.equal(config[0].rect.height, 400);
    });

    test('init without target size', function() {
      var editor = new LayoutEditor({
        padding: { top: 0, bottom: 0, right: 0, left: 0 },
        gap: { vertical: 0, horizontal: 0 },
        layout: { vertical: 1, horizontal: 1 },
        holders: [{ static: true, left: 0, top: 0, width: 1, height: 1 }]
      });
      // without target size, scale ratio should be 1
      editor.init(widgetView);
      assert.equal(editor.scaleRatio, 1);
      // all UI element are still shown as 1280x800 in editor.
      assert.equal(editor.placeHolders[0].width, 1280);
      assert.equal(editor.placeHolders[0].height, 800);
      assert.equal(editor.placeHolders[0].elm.style.left, '0px');
      assert.equal(editor.placeHolders[0].elm.style.top, '0px');
      assert.equal(editor.placeHolders[0].elm.style.width, '1280px');
      assert.equal(editor.placeHolders[0].elm.style.height, '800px');
      // the exported config is fit to 640x400
      var config = editor.exportConfig();
      assert.equal(config[0].rect.left, 0);
      assert.equal(config[0].rect.top, 0);
      assert.equal(config[0].rect.width, 1280);
      assert.equal(config[0].rect.height, 800);
    });
  });

  // test add, remove, update widget
  suite('modify widget', function() {
    var editor;
    var testApp = {
      'name': 'test-app',
      'iconUrl': '/dummy-icon.jpg',
      'manifestURL': 'apps://test-app.gaiamobile.org',
      'entryPoint': ''
    };

    var testApp2 = {
      'name': 'test-app2',
      'iconUrl': '/dummy-icon2.jpg',
      'manifestURL': 'apps://test-app2.gaiamobile.org',
      'entryPoint': ''
    };

    suiteSetup(function() {
      widgetView.innerHTML = '';
    });

    setup(function() {
      editor = new LayoutEditor({
        gap: { vertical: 0, horizontal: 0 },
        layout: { vertical: 3, horizontal: 3 },
        holders: [{ left: 0, top: 0, width: 1, height: 1 },
                  { left: 1, top: 0, width: 1, height: 1 },
                  { left: 2, top: 0, width: 1, height: 1 },
                  { left: 0, top: 1, width: 1, height: 1 },
                  { left: 1, top: 1, width: 1, height: 1 },
                  { left: 2, top: 1, width: 1, height: 1 },
                  { left: 0, top: 2, width: 1, height: 1 },
                  { left: 1, top: 2, width: 1, height: 1 },
                  { left: 2, top: 2, width: 1, height: 1 }]
      });
      editor.init(widgetView, { width: 1280, height: 800, left: 0, top: 0 });
      editor.addWidget(testApp, editor.placeHolders[0]);
    });

    test('addWidget', function() {
      var element = editor.placeHolders[0].elm;
      assert.equal(element.dataset.appName, testApp.name);
      var idx = element.style.backgroundImage.indexOf(testApp.iconUrl);
      assert.isTrue(idx > -1);
    });

    test('double add', function() {
      var evtFired = false;
      function evtChecker(app) {
        evtFired = true;
        assert.equal(app, testApp);
      }
      editor.on('widget-removed', evtChecker);
      // double add
      editor.addWidget(testApp2, editor.placeHolders[0]);
      // check variables
      var element = editor.placeHolders[0].elm;
      assert.equal(element.dataset.appName, testApp2.name);
      var idx = element.style.backgroundImage.indexOf(testApp2.iconUrl);
      assert.isTrue(idx > -1);
      editor.off('widget-removed', evtChecker);
    });

    test('removeWidget', function() {
      var evtFired = false;
      function evtChecker(app) {
        evtFired = true;
        assert.equal(app, testApp);
      }
      editor.on('widget-removed', evtChecker);
      editor.removeWidget(editor.placeHolders[0]);
      assert.isUndefined(editor.placeHolders[0].app);
      var element = editor.placeHolders[0].elm;
      assert.isTrue(!element.dataset.appName);
      assert.isTrue(!element.style.backgroundImage);
      assert.isTrue(evtFired);
      editor.off('widget-removed', evtChecker);
    });

    test('removeWidgets, test-app removed', function() {
      var found = false;
      editor.removeWidgets(function(place, resultCallback) {
        var matched = place.app.manifestURL === testApp.manifestURL &&
                      place.app.entryPoint === testApp.entryPoint;
        resultCallback(matched, place);
        found = found || matched;
      });
      assert.isTrue(found);
    });

    test('removeWidgets, other apps removed', function() {
      var found = false;
      editor.removeWidgets(function(place, resultCallback) {
        var matched = place.app.manifestURL === 'other-app-origin' &&
                      place.app.entryPoint === '';
        resultCallback(matched, place);
        found = found || matched;
      });
      assert.isFalse(found);
    });

    test('updateWidgets, test-app is updated', function() {
      editor.updateWidgets(function(place, resultCallback) {
        if (place.app.manifestURL === testApp.manifestURL &&
            place.app.entryPoint === testApp.entryPoint) {
          place.app.name = 'updated-test-app';
          place.app.iconUrl = '/upated-dummy-icon.jpg';
          resultCallback(true, place);
        }
      });
      var element = editor.placeHolders[0].elm;
      assert.equal(element.dataset.appName, 'updated-test-app');
      var idx = element.style.backgroundImage.indexOf('/upated-dummy-icon.jpg');
      assert.isTrue(idx > -1);
    });

    test('reset', function() {
      editor.reset(function(place) {
        assert.equal(place.app.manifestURL, testApp.manifestURL);
        assert.equal(place.app.entryPoint, testApp.entryPoint);
      });

      var element = editor.placeHolders[0].elm;
      assert.isTrue(!element.dataset.appName);
      assert.isTrue(!element.style.backgroundImage);
    });
  });

  suite('other API', function() {
    var editor;
    var testApp = {
      'name': 'test-app',
      'iconUrl': '/dummy-icon.jpg',
      'manifestURL': 'apps://test-app.gaiamobile.org',
      'entryPoint': ''
    };

    test('getFirstNonStatic', function() {
      editor = new LayoutEditor({
        padding: { top: 0, bottom: 0, right: 0, left: 0 },
        gap: { vertical: 0, horizontal: 0 },
        layout: { vertical: 2, horizontal: 2 },
        holders: [{ static: true, left: 0, top: 0, width: 1, height: 1 },
                  { static: true, left: 1, top: 0, width: 1, height: 1 },
                  { static: true, left: 0, top: 1, width: 1, height: 1 },
                  { left: 1, top: 1, width: 1, height: 1 }]
      });
      editor.init(widgetView, { width: 1280, height: 800, left: 0, top: 0 });
      var place = editor.getFirstNonStatic();
      assert.equal(place.left, 640);
      assert.equal(place.top, 400);
      assert.equal(place.width, 640);
      assert.equal(place.height, 400);
    });

    test('getFirstNonStatic, all static', function() {
      editor = new LayoutEditor({
        padding: { top: 0, bottom: 0, right: 0, left: 0 },
        gap: { vertical: 0, horizontal: 0 },
        layout: { vertical: 2, horizontal: 2 },
        holders: [{ static: true, left: 0, top: 0, width: 1, height: 1 },
                  { static: true, left: 1, top: 0, width: 1, height: 1 },
                  { static: true, left: 0, top: 1, width: 1, height: 1 },
                  { static: true, left: 1, top: 1, width: 1, height: 1 }]
      });
      editor.init(widgetView, { width: 1280, height: 800, left: 0, top: 0 });
      var place = editor.getFirstNonStatic();
      assert.isTrue(!place);
    });

    test('loadWidget', function() {
      editor = new LayoutEditor({
        padding: { top: 0, bottom: 0, right: 0, left: 0 },
        gap: { vertical: 0, horizontal: 0 },
        layout: { vertical: 2, horizontal: 2 },
        holders: [{ left: 0, top: 0, width: 1, height: 1 },
                  { left: 1, top: 0, width: 1, height: 1 },
                  { left: 0, top: 1, width: 1, height: 1 },
                  { left: 1, top: 1, width: 1, height: 1 }]
      });
      editor.init(widgetView, { width: 1280, height: 800, left: 0, top: 0 });
      editor.loadWidget({ app: testApp, positionId: 0});
      var element = editor.placeHolders[0].elm;
      assert.equal(element.dataset.appName, testApp.name);
      var idx = element.style.backgroundImage.indexOf(testApp.iconUrl);
      assert.isTrue(idx > -1);
    });
  });
});
