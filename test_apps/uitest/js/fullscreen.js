'use strict';

var clickHandlers = {
  'fullscreen': function fullscreen() {
    document.getElementById('fullscreen-div').mozRequestFullScreen();
  },
  'fullscreenFrame': function fullscreenFrame() {
    window.parent.document.getElementById('test-iframe').mozRequestFullScreen();
  }
};

document.body.addEventListener('click', function (evt) {
  if (clickHandlers[evt.target.id || evt.target.dataset.fn])
    clickHandlers[evt.target.id || evt.target.dataset.fn].call(this, evt);
});
