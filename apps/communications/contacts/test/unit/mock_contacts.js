'use strict';

var MockContacts = {
  getLength: function(prop) {
    return prop.length;
  },
  isEmpty: function(prop) {
    return false;
  },
  updatePhoto: function(photo, dest) {
    dest.setAttribute('backgroundImage', photo);
  }
};
