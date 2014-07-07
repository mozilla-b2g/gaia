'use strict';
/* exported ActionMenu */

function ActionMenu() {
  return {
    data: {
      list: []
    },
    show: function() {
      this.data.list[0].callback();
    },
    hide: function() {
      this.data.list = [];
    },
    addToList: function(label, callback) {
      this.data.list.push({
        'type': [label],
        'callback': callback
      });
    }
  };
}
