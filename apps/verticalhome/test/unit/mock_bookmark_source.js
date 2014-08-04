'use strict';

function MockBookmarkSource() {
  this.entries = [];
}

MockBookmarkSource.prototype = {
  populate: function(next) {
    next(this.entries);
  }
};
