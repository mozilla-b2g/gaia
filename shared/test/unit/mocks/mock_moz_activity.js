'use strict';

var MockMozActivity = function(info) {
  if (!info) {
    return;
  }

  var name = info.name;
  var data = info.data;

  return {
    set onsuccess(cb) {setTimeout(cb, 50)},
    set onerror(cb) {},
    name: name,
    data: data
  };

};
