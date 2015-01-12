'use strict';

/* global SettingsView, HandwritingSettingsGroupView, BaseView */

require('/js/settings/close_locks.js');
require('/js/settings/base_view.js');
require('/js/settings/settings_view.js');

require('/js/settings/handwriting_settings_view.js');

suite('HandwritingSettingsGroupView', function() {
  var groupView;
  var stubSettingsView;
  var container;
  var app;

  setup(function() {
    container = { stub: 'container' };
    app = { stub: 'app' };
    window.HandwritingPadSettings = { stub: 'HandwritingPadSettings' };

    this.sinon.stub(document, 'getElementById').returns(container);
    stubSettingsView = this.sinon.stub(Object.create(SettingsView.prototype));
    this.sinon.stub(window, 'SettingsView').returns(stubSettingsView);

    groupView = new HandwritingSettingsGroupView(app);
  });

  test('inheritance of BaseView', function() {
    assert.instanceOf(groupView, BaseView);
  });

  test('start/stop', function() {
    groupView.start();

    assert.isTrue(document.getElementById.calledWith(groupView.CONTAINER_ID));

    assert.isTrue(window.SettingsView.calledWith(
      app, container, window.HandwritingPadSettings));
    assert.isTrue(stubSettingsView.start.calledOnce);

    assert.equal(groupView.childViews.handwritingSettings, stubSettingsView);

    groupView.stop();

    assert.notProperty(groupView.childViews, 'handwritingSettings');

    assert.isTrue(stubSettingsView.stop.calledOnce);
  });
});
