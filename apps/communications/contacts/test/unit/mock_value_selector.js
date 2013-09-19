'use strict';

function ValueSelector() {
  return {
    data: {
      list: []
    },
    show: function() {},
    hide: function() {},
    addToList: function(label, value) {
      this.data.list.push({
        'type': [label],
        'value': value
      });
    },
    set onchange(callback) {
      // we always return the first value added
      if (callback)
        callback(this.data.list[0].value);
    }
  };

  init();
}

