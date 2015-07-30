/* globals GaiaPinCard */

'use strict';

(function() {
  var pinCard = new GaiaPinCard();
  pinCard.background = {
    src: '../images/default_icon.png'
  };
  pinCard.title = 'Pin Title';
  document.body.appendChild(pinCard);

  var pinCard2 = new GaiaPinCard();
  pinCard2.title = 'Pin Title2';
  pinCard2.description = 'Pin with description';
  document.body.appendChild(pinCard2);
})();
