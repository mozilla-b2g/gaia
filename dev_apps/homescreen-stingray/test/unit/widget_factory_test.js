'use strict';

/* global MockApplications, WidgetFactory */

require('/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('homescreen-stingray/test/unit/mock_applications.js');
requireApp('homescreen-stingray/test/unit/mock_widget_window.js');
requireApp('homescreen-stingray/js/browser_config_helper.js');
requireApp('homescreen-stingray/js/widget_factory.js');

var mocksForWidgetFactory = new MocksHelper([
  'Applications', 'WidgetWindow', 'ManifestHelper'
]).init();


suite('homescreen-stingray/WidgetFactory', function() {
  mocksForWidgetFactory.attachTestHelpers();

  var fakeWidgetConfig1 = {
    'url': 'app://fakewidget1.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Widget 1',
    'manifestURL': 'app://fakewidget1.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakewidget.gaiamobile.org',
    'manifest': {
      'name': 'Fake Widget 1'
    }
  };

  var fakeWidgetRequest = {
    app: {
      'manifestURL': 'app://fakewidget1.gaiamobile.org/manifest.webapp',
      'entryPoint': '',
    },
    rect: {
      'left': 10,
      'top': 10,
      'width': 100,
      'height': 100
    }
  };

  var mockUI;
  var widgetFactory;
  var realApplications;

  suiteSetup(function() {
    mockUI = document.createElement('div');
    mockUI.classList.add('widget-overlay');
    document.body.appendChild(mockUI);
    MockApplications.mApps[fakeWidgetConfig1.manifestURL] = fakeWidgetConfig1;

    realApplications = window.Applications;
    window.Applications = MockApplications;

    widgetFactory = new WidgetFactory('');
  });

  suiteTeardown(function() {
    document.body.removeChild(mockUI);
    window.Applications = realApplications;
  });

  test('create widget', function() {
    assert.isDefined(widgetFactory.createWidget(fakeWidgetRequest));
  });
});
