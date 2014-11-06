'use strict';

/* global HandwritingPadsManager, SettingsPromiseManager */

require('/js/keyboard/handwriting_pads_manager.js');
require('/js/keyboard/settings.js');

suite('HandwritingPadsManager ', function() {
  var app;
  var manager;
  var point;

  setup(function() {
    // Create fake app
    app = {
      settingsPromiseManager: new SettingsPromiseManager(),
      layoutRenderingManager: {
        drawHandwritingPad: function() {
          return point;
        }
      }
    };

    this.sinon.stub(window, 'setTimeout');
    this.sinon.stub(window, 'clearTimeout');

    manager = new HandwritingPadsManager(app);
    manager.start();
  });

  teardown(function() {
    app = null;
    manager = null;
    point = null;
  });

  test('handle press events', function() {
    point = {
      posX: 20,
      posY: 20
    };

    var press = {
      clientX: 10,
      clientY: 10
    };

    // Press start
    manager.handlePressStart(press);
    assert.isTrue(window.clearTimeout.calledOnce);
    assert.equal(manager._strokePoints[0], 20);
    assert.equal(manager._strokePoints[1], 20);

    point = {
      posX: 25,
      posY: 25
    };
    // Press move
    manager.handlePressMove(press);
    assert.equal(manager._strokePoints[2], 25);
    assert.equal(manager._strokePoints[3], 25);

    // Press End
    manager.handlePressEnd();
    assert.isTrue(window.setTimeout.calledOnce);
    assert.equal(manager._strokePoints[4], -1);
    assert.equal(manager._strokePoints[5], 0);
  });
});
