'use strict';

var clickHandlers = {
/*
  'id': function () {
    alert('event triggered!');
  }, */
};

document.body.addEventListener('click', function(evt) {
  if (clickHandlers[evt.target.id || evt.target.dataset.fn])
    clickHandlers[evt.target.id || evt.target.dataset.fn].call(this, evt);
});
