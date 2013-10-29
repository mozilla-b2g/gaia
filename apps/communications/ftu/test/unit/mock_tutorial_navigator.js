'use strict';

var MockMozApps = {
  onsuccess: function() {
  },
  result: {
    connect: function() {
      return this;
    },
    then: function() {
    }
  },
  getSelf: function() {
    return this.onsuccess;
  }
};
