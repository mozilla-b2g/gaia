/* global assert, helper */
'use strict';
suite('marionette/index', function() {
  var Index;

  suiteSetup(function() {
    Index = helper.requireLib('marionette/index');
  });

  test('should have paths', function() {
    assert.instanceOf(Index.Element, Object);
    assert.instanceOf(Index.Client, Object);
    assert.instanceOf(Index.Drivers, Object);
    assert.instanceOf(Index.CommandStream, Object);

    assert.instanceOf(Index.Drivers.Abstract, Object);


    if (typeof(window) === 'undefined') {
      assert.instanceOf(Index.Drivers.Tcp, Object);
    } else {
      try {
        if (typeof(window.navigator.mozTCPSocket) !== 'undefined') {
          assert.instanceOf(Index.Drivers.MozTcp, Object);
        }
      } catch(e) {
      }
    }
  });


});
