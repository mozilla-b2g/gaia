requireCommon('/vendor/marionette-client/marionette.js');

suite('marrionete tests', function() {

  var device;

  testSupport.startMarionette(function(client) {
    device = client;
  });

  test('remote math', function() {
    this.timeout(10000);
    var result;
    result = yield device.executeScript('return (1 + 1) * 5;');
    assert.equal(result, '10');
  });

  //the current goUrl shim is too hacky wait
  //for marionette to fix goUrl.
  //suite('google', function() {
    //var result;

    //suiteSetup(function() {
      //this.timeout(10000);
      //yield device.goUrl('https://google.com/');
    //});

   //test('search box', function() {
     //this.timeout(10000);
     //var el = yield device.findElement('input[name=\'q\']');
     //assert.ok(yield el.displayed());
   //});
  //});

});
