'use strict';

/* global WidgetWindow, WidgetManager */

require('/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('homescreen-stingray/js/browser_config_helper.js');
requireApp('homescreen-stingray/js/widget_manager.js');
requireApp('homescreen-stingray/test/unit/mock_widget_window.js');

var mocksForWidgetManager = new MocksHelper([
  'ManifestHelper', 'WidgetWindow'
]).init();


suite('homescreen-stingray/WidgetManager', function() {

  mocksForWidgetManager.attachTestHelpers();

  var fakeWidgetConfig1 = {
    'url': 'app://fakewidget1.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Widget 1',
    'manifestURL': 'app://fakewidget1.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakewidget1.gaiamobile.org',
    'manifest': {
      'name': 'Fake Widget 1'
    }
  };

  var fakeWidgetConfig2 = {
    'url': 'app://fakewidget2.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Widget 2',
    'manifestURL': 'app://fakewidget2.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakewidget2.gaiamobile.org',
    'manifest': {
      'name': 'Fake Widget 2'
    }
  };

  var mockUI;
  var widgetManager;

  suiteSetup(function() {
    mockUI = document.createElement('div');
    mockUI.id = 'widget-container';
    document.body.appendChild(mockUI);
  });

  suiteTeardown(function() {
    document.body.removeChild(mockUI);
  });

  var mockWidget1, mockWidget2;

  function publish(event, detail) {
    window.dispatchEvent(new CustomEvent(event, {detail: detail}));
  }

  setup(function() {
    widgetManager = new WidgetManager();
    widgetManager.start();

    mockWidget1 = new WidgetWindow(fakeWidgetConfig1);
    publish('widgetcreated', mockWidget1);
    mockWidget2 = new WidgetWindow(fakeWidgetConfig2);
    publish('widgetcreated', mockWidget2);
  });

  teardown(function() {
    widgetManager.stop();
  });

  test('getWidget() should return instance of widget window', function() {
    assert.equal(widgetManager.getWidget(mockWidget1.instanceID), mockWidget1);
  });

  test('remove() should destroy instance', function() {
    var destroyStub = this.sinon.stub(mockWidget1, 'destroy');
    widgetManager.remove(mockWidget1.instanceID);
    assert.isTrue(destroyStub.calledOnce);
  });

  suite('widget overlay manipulation', function() {
    setup(function() {
      mockUI.style.display = null;
    });

    test('hideAll() should hide the whole widget layer', function() {
      widgetManager.hideAll();
      assert.equal(mockUI.style.display, 'none');
    });

    test('showAll() should hide the whole widget layer', function() {
      widgetManager.showAll();
      assert.equal(mockUI.style.display, 'block');
    });
  });

  suite('Event handling', function() {
    test('should set the widget to visible on launchwidget', function() {
      var setVisibleStub1 = this.sinon.stub(mockWidget1, 'setVisible')
                            .withArgs(true);
      publish('launchwidget', mockWidget1.instanceID);
      assert.isTrue(setVisibleStub1.calledOnce);
    });

    test('should remove widget permanently on widgetterminated', function() {
      assert.isNotNull(widgetManager.getWidget(mockWidget2));
      publish('widgetterminated', mockWidget2);
      assert.isUndefined(widgetManager.getWidget(mockWidget2));
    });
  });
});
