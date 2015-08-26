// Cards Helper Test
/* globals CardsHelper */

'use strict';

requireApp('system/js/cards_helper.js');

suite('cards helper >', function() {

  test('getOffOrigin', function() {
    var url = 'http://somehost.com/path';
    assert.ok( !CardsHelper.getOffOrigin('app://host:8080/', url) );
    assert.ok( CardsHelper.getOffOrigin('http://somehost.com/otherpath', url) );
  });

});
