/* global GestureDetector, KeyEvent */
'use strict';

(function(exports) {
  function initGesture() {
    function fireKeyEvent(keyCode, key) {
      var eventObj = document.createEvent('Events');
      eventObj.initEvent('keydown', true, true);
      eventObj.key = key;
      eventObj.keyCode = keyCode;
      eventObj.which = keyCode;
      window.dispatchEvent(eventObj);

      eventObj = document.createEvent('Events');
      eventObj.initEvent('keypress', true, true);
      eventObj.key = key;
      eventObj.keyCode = keyCode;
      eventObj.which = keyCode;
      window.dispatchEvent(eventObj);

      eventObj = document.createEvent('Events');
      eventObj.initEvent('keyup', true, true);
      eventObj.key = key;
      eventObj.keyCode = keyCode;
      eventObj.which = keyCode;
      window.dispatchEvent(eventObj);
    }

    new GestureDetector(document.body).startDetecting();

    document.addEventListener('swipe', function(evt) {
      var direction = evt.detail.direction;
      var keyDefine = {
        'up': [KeyEvent.DOM_VK_UP, 'Up'],
        'right': [KeyEvent.DOM_VK_RIGHT, 'Right'],
        'down': [KeyEvent.DOM_VK_DOWN, 'Down'],
        'left': [KeyEvent.DOM_VK_LEFT, 'Left']
      };
      fireKeyEvent(keyDefine[direction][0], keyDefine[direction][1]);
    });

    document.addEventListener('dbltap', function(evt) {
      fireKeyEvent(KeyEvent.DOM_VK_RETURN, 'Enter');
    });

    document.addEventListener('transform', function(evt) {
      fireKeyEvent(KeyEvent.DOM_VK_ESCAPE, 'Esc');
    });
  }
  /* exports.initFakeAppEvent = initFakeAppEvent; */
  exports.initGesture = initGesture;
})(window);

window.initGesture();
