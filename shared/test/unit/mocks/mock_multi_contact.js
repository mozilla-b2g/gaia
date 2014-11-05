'use strict';

/* globals Promise */

var MockMultiContact = {
  _data: Object.create(null),

  getData: function(entry) {
    return new Promise(function(resolve, reject) {
      var id = entry.entryData[0].uid;

      resolve(MockMultiContact._data[id]);
    });
  }
};
