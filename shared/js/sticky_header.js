/* exported StickyHeader */

function StickyHeader(scrollable, sticky) {
  'use strict';

  var headers = scrollable.getElementsByTagName('header');
  var stickyPosition = sticky.offsetHeight + sticky.offsetTop;
  var stickyStyle = sticky.style;

  this.refresh = function() {
    for (var i = 1, length = headers.length; i < length; i++) {
      if (headers[i].offsetTop - scrollable.scrollTop > stickyPosition) {

        // While reflecting a header, make sure to not reflect a header
        // that is not displayed.
        var lookupIndex = 1;
        var header = headers[i - lookupIndex];
        while (header && header.offsetHeight === 0) {
          lookupIndex++;
          header = headers[i - lookupIndex];
        }

        stickyStyle.backgroundImage = '-moz-element(#' + header.id + ')';
        break;
      }
    }
  };

  scrollable.addEventListener('scroll', this.refresh);
}
