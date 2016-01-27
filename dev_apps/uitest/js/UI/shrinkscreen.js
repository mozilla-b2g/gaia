'use strict';

function shrinkscreenTest() {
  var testBtntilt = document.getElementById('testBtn-tilt');
  var testBtnnotilt = document.getElementById('testBtn-notilt');
  var isShrinktilt = false;
  var isShrinknotilt = false;
  var displayMode;
  var shrinkingUI=new ShrinkingUI(window.parent.document.getElementById('test-iframe'), document.body);

  function clickHandlers(evt) {
    switch (evt.target.id) {
      case 'testBtn-tilt':
        if (!isShrinktilt) {
          shrinkingUI.startTilt();
          console.log ('Tilting!');
          testBtntilt.textContent = 'Cancel Tilting';
        } else {
          shrinkingUI.stopTilt();
          console.log ('Stop Tilting!');
          testBtntilt.textContent = 'Test';
        }
        isShrinktilt = !isShrinktilt;
        break;
      case 'testBtn-notilt':
        if (!isShrinknotilt) {
           shrinkingUI.start();
           testBtnnotilt.textContent = 'Cancel Shrinking';
           console.log ('Shrinking!');
        } else {
           shrinkingUI.stop();
           console.log ('Stop shrinking!');
           testBtnnotilt.textContent = 'Test';
        }
        isShrinknotilt = !isShrinknotilt;
        break;
    }
  };

  document.body.addEventListener('click', clickHandlers.bind(this));
}

window.addEventListener('load', shrinkscreenTest);
