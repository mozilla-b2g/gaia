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
  },
  'button31': function() {
    var msg = 'Hello world!1\n2\n3\n4\n5\n6\n7\n8\n9';
    msg += '\n10\n11\n12\n13\n14\n15\n16\n17\n18\n';
    alert(msg);
  },
  'button32': function() {
    var msg = 'Hello world!1\n2\n3\n4\n5\n6\n7\n8\n9';
    msg += '\n10\n11\n12\n13\n14\n15\n16\n17\n18\n';
    alert(confirm(msg));
  },
  'button33': function() {
    var msg = 'Hello world!1\n2\n3\n4\n5\n6\n7\n8\n9';
    msg += '\n10\n11\n12\n13\n14\n15\n16\n17\n18\n';
    alert(prompt(msg));
  }
};

document.body.addEventListener('click', function(evt) {
  if (clickHandlers[evt.target.id])
    clickHandlers[evt.target.id].call(this, evt);
});
