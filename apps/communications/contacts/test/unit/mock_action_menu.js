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
    addToList: function(labelL10n, callback) {
      this.data.list.push({
        'type': [labelL10n],
        'callback': callback
      });
    }
  };
}
