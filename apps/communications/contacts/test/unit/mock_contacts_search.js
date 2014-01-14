'use strict';

var MockContactsSearch = {
  'init': function(s, d, n) {},
  'invalidateCache': function() {},
  'appendNodes': function(nodes) {},
  'removeContact': function(id) {},
  'search': function(cb) { cb(); },
  'enterSearchMode': function(evt) {},
  'exitSearchMode': function(evt) {},
  'isInSearchMode': function() { return false; },
  'enableSearch': function() {},
  'selectRow': function(id, value) {}
};
