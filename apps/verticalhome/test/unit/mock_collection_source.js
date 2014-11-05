'use strict';

function MockCollectionSource() {
  this.entries = [];
}

MockCollectionSource.prototype = {
  populate: function(next) {
    next(this.entries);
  }
};
