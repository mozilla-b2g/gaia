'use strict';

function fullscreenTest() {
  var fullscreenDiv = document.getElementById('fullscreen-div');
  
  var testBtnDiv = document.getElementById('testBtn-div');
  var testBtn = document.getElementById('testBtn');
  var isFullscreenDiv = false;
  var isFullscreen = false;
  var displayMode;

  function clickHandlers(evt) {
    switch (evt.target.id) {
      case 'testBtn':
        if (!isFullscreen) {
          window.parent.document.getElementById('test-iframe')
                                                .mozRequestFullScreen();
          testBtn.textContent = 'Cancel fullscreen';
        } else {
          window.parent.document.mozCancelFullScreen();
          testBtn.textContent = 'Test';
        }
        isFullscreen = !isFullscreen;
        break;
      case 'testBtn-div':
        if (!isFullscreenDiv) {
          fullscreenDiv.mozRequestFullScreen();
          testBtnDiv.textContent = 'Cancel fullscreen';
        } else {
          document.mozCancelFullScreen();
          testBtnDiv.textContent = 'Test';
          
          // Also cancels fullscreen of caused by another button (if any)
          isFullscreen = false;
          testBtn.textContent = 'Test';
        }
        isFullscreenDiv = !isFullscreenDiv;
        break;
    }
  };

  document.body.addEventListener('click', clickHandlers.bind(this));
}

window.addEventListener('load', fullscreenTest);
