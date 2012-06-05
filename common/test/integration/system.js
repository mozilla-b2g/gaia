if (typeof(testSupport) === 'undefined') {
  testSupport = {};
}

testSupport.system = {

  start: function(cb) {
    client.goUrl('http://system.gaiamobile.org', cb);
  },

  unlock: function() {

  }

};
