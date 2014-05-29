'use strict';

/* global WidgetWindow, BrowserFrame */
require('/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('homescreen-stingray/js/browser_config_helper.js');
requireApp('homescreen-stingray/js/browser_frame.js');
requireApp('homescreen-stingray/js/widget_window.js');

var mocksForWidgetWindow = new MocksHelper([
  'ManifestHelper'
]).init();

suite('system/WidgetWindow', function() {

  mocksForWidgetWindow.attachTestHelpers();

  var dummyContainer;
  var widgetWindow;
  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  suiteSetup(function() {
    dummyContainer = document.createElement('div');
    document.body.appendChild(dummyContainer);
  });

  suiteTeardown(function() {
    document.body.removeChild(dummyContainer);
  });

  setup(function() {
    widgetWindow = new WidgetWindow(fakeAppConfig1, dummyContainer);
  });

  test('constructor should set containerElement by parameter', function() {
    assert.equal(widgetWindow.containerElement, dummyContainer);
    assert.notEqual(dummyContainer.innerHTML, '');
  });

  test('setStyle() should update style of window elemnt', function() {
    widgetWindow.setStyle({ 'left': 100, 'top': 100,
                            'width': 500, 'height': 500 });
    assert.equal(widgetWindow.element.style.top, '100px');
    assert.equal(widgetWindow.element.style.left, '100px');
    assert.equal(widgetWindow.element.style.width, '500px');
    assert.equal(widgetWindow.element.style.height, '500px');
  });

  test('render() should initialize properties', function() {
    widgetWindow.render();
    assert.instanceOf(widgetWindow.browser, BrowserFrame);
    assert.equal(widgetWindow.element.id, widgetWindow.instanceID);
  });

  test('view() should return its corresponding html view string', function() {
    var dummyDiv = document.createElement('div');
    dummyDiv.innerHTML = widgetWindow.view();
    assert.equal(dummyDiv.firstChild.id, widgetWindow.instanceID);
  });

  test('setVisible() should change visibility of its frame', function() {
    widgetWindow.browser.element.setVisible = this.sinon.stub();
    var setVisibleStub = widgetWindow.browser.element.setVisible;
    var setToTrueStub = setVisibleStub.withArgs(true);
    widgetWindow.setVisible(true);
    assert.isTrue(setToTrueStub.calledOnce);

    var setToFalseStub = setVisibleStub.withArgs(false);
    widgetWindow.setVisible(false);
    assert.isTrue(setToFalseStub.calledOnce);
  });

  test('destroy() should remove container element', function() {
    widgetWindow.destroy();
    assert.isNull(widgetWindow.element);
    assert.isNull(document.getElementById(widgetWindow.instanceID));
  });
});
