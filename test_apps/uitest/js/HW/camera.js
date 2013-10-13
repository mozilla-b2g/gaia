'use strict';

var clickHandlers = {
  'camera': function() {
    var activity = new MozActivity({
      name: 'record',
      data: {
        type: 'photos'
      }
    });
  }
};

document.body.addEventListener('click', function(evt) {
  if (clickHandlers[evt.target.id]) {
    clickHandlers[evt.target.id].call(this, evt);
  }
});

