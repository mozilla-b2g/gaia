'use strict';

var clickHandlers = {
  'go': function _go() {
    var URL = document.getElementById('URL').value;
    var a = new MozActivity({ name: 'view', data: {type: 'url', url: URL }});
    a.onsuccess = function() { alert('Success!'); };
    a.onerror = function() { alert('Failure going to URL'); };
  }
};

document.body.addEventListener('click', function(evt) {
  if (clickHandlers[evt.target.id || evt.target.dataset.fn])
    clickHandlers[evt.target.id || evt.target.dataset.fn].call(this, evt);
});
