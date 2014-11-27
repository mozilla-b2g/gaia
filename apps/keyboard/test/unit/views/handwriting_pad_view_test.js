'use strict';

/* global HandwritingPadView */

require('/js/views/handwriting_pad_view.js');

suite('Views > HandwritingPadView', function() {
  var handwritingPadView;
  var canvas;

  var STROKE_WIDTH = 6;

  var pressStart = {
    moved: false,
    clientX: 20,
    clientY: 20
  };

  var pressMove = {
    moved: true,
    clientX: 25,
    clientY: 25
  };

  var rootElement = document.createElement('div');
  document.body.appendChild(rootElement);
  document.body.style.pad = 0;
  document.body.style.margin = 0;

  var viewManager = {
    registerView: sinon.stub()
  };

  suite('basic testing', function() {
    setup(function() {
      var target = {};
      handwritingPadView = new HandwritingPadView(target, {}, viewManager);
      handwritingPadView.render();
      canvas = handwritingPadView.element;
    });

    test(' > get element', function() {
      assert.equal(canvas instanceof HTMLCanvasElement, true);
    });

    test('invoke viewManager.registerView', function() {
      var mockViewManager = {
        registerView: this.sinon.stub()
      };

      var target = {};
      var padView = new HandwritingPadView(target, {}, mockViewManager);
      padView.render();

      assert.isTrue(mockViewManager.registerView.calledOnce);
      assert.isTrue(mockViewManager.registerView.calledWith(target,
                                                            padView));
    });

    test(' > drawHandwritingPad()', function() {
      rootElement.appendChild(canvas);

      var point = handwritingPadView.drawHandwritingPad(pressStart, true,
                                                        STROKE_WIDTH);

      assert.equal(point.posX, pressStart.clientX * window.devicePixelRatio,
                   'Error occured in drawCanvas when press start!');
      assert.equal(point.posY, pressStart.clientY * window.devicePixelRatio,
                   'Error occured in drawCanvas when press start!');

      point = handwritingPadView.drawHandwritingPad(pressMove, false,
                                                    STROKE_WIDTH);

      assert.equal(point.posX, pressMove.clientX * window.devicePixelRatio,
                   'Error occured in drawCanvas when press move!');
      assert.equal(point.posY, pressMove.clientY * window.devicePixelRatio,
                   'Error occured in drawCanvas when press move!');
    });

    test(' > resize()', function() {
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        get: () => 2 }
      );

      handwritingPadView.resize(200, 400);

      var canvas = handwritingPadView.element;

      assert.equal(canvas.width, '400');
      assert.equal(canvas.height, '800');

      assert.equal(canvas.style.width, '200px');
      assert.equal(canvas.style.height, '400px');
    });
  });
});
