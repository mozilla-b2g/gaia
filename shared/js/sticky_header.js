/* exported StickyHeader */

function StickyHeader(scrollable, sticky) {
  'use strict';

  var headers = scrollable.getElementsByTagName('header');
  var stickyPosition;
  var stickyStyle = sticky.style;

  this._throttledRefresh = function() {
    var display = false;
    if (stickyPosition === undefined) {
      stickyPosition = sticky.offsetHeight + sticky.offsetTop;
    }
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
        display = true;
        break;
      }
    }

    sticky.classList.toggle('has-content', display);
    this.throttle = null;
  }.bind(this);

  this.refresh = function() {
    if (!this.throttle) {
      this.throttle = setTimeout(this._throttledRefresh, 0);
    }
  }.bind(this);

  scrollable.addEventListener('scroll', this.refresh);
}
