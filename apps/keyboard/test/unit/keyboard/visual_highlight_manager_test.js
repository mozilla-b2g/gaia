'use strict';

/* global VisualHighlightManager */

require('/js/keyboard/visual_highlight_manager.js');

suite('VisualHighlightManager', function() {
  var app;
  var manager;
  var target;

  setup(function() {
    app = {
      isCapitalized: this.sinon.stub()
    };

    // Create fake IMERender
    window.IMERender = {
      highlightKey: this.sinon.stub(),
      unHighlightKey: this.sinon.stub()
    };

    target = {};

    manager = new VisualHighlightManager(app);
    manager.start();
  });

  teardown(function() {
    window.IMERender = null;
    app = null;
  });

  test('show (lower case)', function() {
    app.isCapitalized.returns(false);
    manager.show(target);

    assert.isTrue(window.IMERender.highlightKey
      .calledWith(target, { showUpperCase: false }));
  });

  test('show (upper case)', function() {
    app.isCapitalized.returns(true);
    manager.show(target);

    assert.isTrue(window.IMERender.highlightKey
      .calledWith(target, { showUpperCase: true }));
  });

  test('hide', function() {
    manager.hide(target);

    assert.isTrue(window.IMERender.unHighlightKey.calledWith(target));
  });
});
