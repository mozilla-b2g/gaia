'use strict';

/* global HandwritingPadView, IMERender */

require('/js/views/handwriting_pad_view.js');
require('/js/render.js');

suite('Views > HandwritingPadView', function() {
  var handwritingPadView;
  var canvas;

  var STROKE_WIDTH = 6;

  var target = {
    isHandwritingPad: true
  };

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

  suite('basic testing', function() {
    setup(function() {
      IMERender.init(null);
      handwritingPadView = new HandwritingPadView();
      canvas = handwritingPadView.getHandwritingPad();
    });

    test(' > getHandwritingPad()', function() {
      assert.equal(canvas instanceof HTMLCanvasElement, true);
    });

    test(' > drawHandwritingPad()', function() {
      rootElement.appendChild(canvas);

      IMERender.targetObjDomMap.set(target, canvas);

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
  });
});
