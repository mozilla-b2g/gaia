System.baseURL = '/js/compiled/';
System.import('./foobar').then(function(m) {
  var foobar = new m.foobar();
  foobar.start();
}).catch(console.error.bind(console));
