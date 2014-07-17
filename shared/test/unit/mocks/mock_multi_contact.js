'use strict';

/* globals Promise */

var MockMultiContact = {
  _data: Object.create(null),
  
  getData: function(entries) {
    return new Promise(function(resolve, reject) {
      var id = entries[0].entryData[0].uid;
      
      resolve(MockMultiContact._data[id]);
    });
  }
};
