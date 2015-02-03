'use strict';

/* global SettingsView, GeneralSettingsGroupView, BaseView */

require('/js/settings/close_locks.js');
require('/js/settings/base_view.js');
require('/js/settings/settings_view.js');

require('/js/settings/general_settings_view.js');

suite('GeneralSettingsGroupView', function() {
  var groupView;
  var stubSettingsView;
  var container;
  var app;

  setup(function() {
    container = { stub: 'container' };
    app = { stub: 'app' };
    window.SoundFeedbackSettings = { stub: 'SoundFeedbackSettings' };
    window.VibrationFeedbackSettings = { stub: 'VibrationFeedbackSettings' };
    window.IMEngineSettings = { stub: 'IMEngineSettings' };

    this.sinon.stub(document, 'getElementById').returns(container);
    stubSettingsView = this.sinon.stub(Object.create(SettingsView.prototype));
    this.sinon.stub(window, 'SettingsView').returns(stubSettingsView);

    groupView = new GeneralSettingsGroupView(app);
  });

  test('inheritance of BaseView', function() {
    assert.instanceOf(groupView, BaseView);
  });

  test('start/stop', function() {
    groupView.start();

    assert.isTrue(document.getElementById.calledWith(groupView.CONTAINER_ID));

    assert.isTrue(window.SettingsView.calledWith(
      app, container, window.SoundFeedbackSettings));
    assert.isTrue(window.SettingsView.calledWith(
      app, container, window.VibrationFeedbackSettings));
    assert.isTrue(window.SettingsView.calledWith(
      app, container, window.IMEngineSettings));
    assert.isTrue(stubSettingsView.start.calledThrice);

    assert.equal(groupView.childViews.soundFeedbackSettings, stubSettingsView);
    assert.equal(groupView.childViews.vibrationFeedbackSettings,
      stubSettingsView);
    assert.equal(groupView.childViews.imEngineSettings, stubSettingsView);

    groupView.stop();

    assert.notProperty(groupView.childViews, 'soundFeedbackSettings');
    assert.notProperty(groupView.childViews, 'vibrationFeedbackSettings');
    assert.notProperty(groupView.childViews, 'imEngineSettings');

    assert.isTrue(stubSettingsView.stop.calledThrice);
  });
});
