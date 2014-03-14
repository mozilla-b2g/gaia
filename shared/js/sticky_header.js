/* exported StickyHeader */

function StickyHeader(scrollable, sticky) {
  'use strict';

  var headers = scrollable.getElementsByTagName('header');
  var stickyPosition = sticky.offsetHeight + sticky.offsetTop;
  var stickyStyle = sticky.style;

  this.refresh = function() {
    for (var i = 1, length = headers.length; i < length; i++) {
      if (headers[i].offsetTop - scrollable.scrollTop > stickyPosition) {
        stickyStyle.backgroundImage = '-moz-element(#' + headers[i-1].id + ')';
        break;
      }
    }
  };

  scrollable.addEventListener('scroll', this.refresh);
}
