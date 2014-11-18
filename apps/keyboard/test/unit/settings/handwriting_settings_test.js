'use strict';

/* global SettingsView, HandwritingSettingsGroupView */

require('/js/settings/close_locks.js');
require('/js/settings/settings_view.js');

require('/js/settings/handwriting_settings.js');

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

  test('start/stop', function() {
    groupView.start();

    assert.isTrue(document.getElementById.calledWith(groupView.PANEL_ID));

    assert.isTrue(window.SettingsView.calledWith(
      app, container, window.HandwritingPadSettings));
    assert.isTrue(stubSettingsView.start.calledOnce);

    groupView.stop();

    assert.isTrue(stubSettingsView.stop.calledOnce);
  });
});
