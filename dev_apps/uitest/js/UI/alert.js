'use strict';

var clickHandlers = {
  'button1': function() {
    window.parent.alert('Hello world!');
  },
  'button2': function() {
    window.parent.alert(window.parent.confirm('Hello world?'));
  },
  'button3': function() {
    window.parent.alert(window.parent.prompt('Hello world:', 'initial value'));
  },
  'button21': function() {
    alert('Hello world!');
  },
  'button22': function() {
    alert(confirm('Hello world?'));
  },
  'button23': function() {
    alert(prompt('Hello world:', 'initial value'));
  }
};

document.body.addEventListener('click', function(evt) {
  if (clickHandlers[evt.target.id])
    clickHandlers[evt.target.id].call(this, evt);
});
