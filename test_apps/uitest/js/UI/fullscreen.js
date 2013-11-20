'use strict';

function fullscreenTest() {
  var fullscreenDiv = document.getElementById('fullscreen-div');
  var cancelButtonDiv = document.getElementById('cancleFullscreen-div');
  var cancelButton = document.getElementById('cancleFullscreen');

  function clickHandlers(evt) {
    switch (evt.target.id) {
      case 'fullscreen':
        fullscreenDiv.mozRequestFullScreen();
        cancelButtonDiv.hidden = false;
      break;
      case 'fullscreenFrame':
        window.parent.document.getElementById('test-iframe')
                                              .mozRequestFullScreen();
        cancelButton.hidden = false;
      break;
      case 'cancleFullscreen-div':
        document.mozCancelFullScreen();
        cancelButtonDiv.hidden = true;
        cancelButton.hidden = true;
      break;
      case 'cancleFullscreen':
        window.parent.document.mozCancelFullScreen();
        cancelButton.hidden = true;
        break;
    }
  };

  cancelButtonDiv.hidden = true;
  cancelButton.hidden = true;

  document.body.addEventListener('click', clickHandlers.bind(this));
}

window.addEventListener('load', fullscreenTest);
