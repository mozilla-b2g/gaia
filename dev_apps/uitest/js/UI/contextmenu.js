'use strict';

var clickHandlers = {
  'reload': function() {
    window.location.reload();
  },
  'comments': function() {
    window.location = '#comments';
    alert(window.location.href);
  },
  'twitter': function() {
    window.open('http://twitter.com/intent/tweet?text=' +
      document.title + ':  ' + window.location.href, 'shareWindow');
  },
  'facebook': function() {
    window.open('http://facebook.com/sharer/sharer.php?u=' +
      window.location.href, 'shareWindow');
  }
};

document.body.addEventListener('click', function(evt) {
  if (clickHandlers[evt.target.id || evt.target.dataset.fn])
    clickHandlers[evt.target.id || evt.target.dataset.fn].call(this, evt);
});
