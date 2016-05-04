define(function(require, exports, module) {
'use strict';

module.exports = function animatedScroll(opts) {
  var {container, content, scrollTop} = opts;

  var maxScroll = container.scrollHeight - container.clientHeight;
  // safeguard against negative or `null` scrollTop (0 < scrollTop < maxScroll)
  scrollTop = Math.min(Math.max(scrollTop, 0), maxScroll);

  var diff = container.scrollTop - scrollTop;
  var seconds = Math.abs(diff) / 500;

  // hide scrollbar during animation to avoid errors introduced by user trying
  // to scroll while transition is still running; it also avoids weird
  // sensation of content moving while scrollbar is still at same position
  container.style.overflowY = 'hidden';

  window.requestAnimationFrame(() => {
    content.style.transform = 'translateY(' + diff + 'px)';
    // easeOutQuart borrowed from http://matthewlein.com/ceaser/
    content.style.transition = 'transform ' + seconds + 's ' +
      'cubic-bezier(0.165, 0.840, 0.440, 1.000)';
  });

  content.addEventListener('transitionend', function setScrollTop() {
    content.removeEventListener('transitionend', setScrollTop);
    content.style.transform = '';
    content.style.transition = '';
    container.scrollTop = scrollTop;
    container.style.overflowY = 'scroll';
  });
};

});
