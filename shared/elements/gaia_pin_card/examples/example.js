/* globals GaiaPinCard */

'use strict';

(function() {
  var pinCard = new GaiaPinCard();
  pinCard.background = {
    src: '../images/default_icon.png'
  };
  pinCard.title = 'Long pin title lorem ipsum lorem ipsum lorem ipsum';
  document.body.appendChild(pinCard);

  var pinCard2 = new GaiaPinCard();
  pinCard2.title = 'Long pin title lorem ipsum lorem ipsum lorem ipsum';
  pinCard2.description = 'Long pin description lorem ipsum lorem ipsum';
  document.body.appendChild(pinCard2);
})();
