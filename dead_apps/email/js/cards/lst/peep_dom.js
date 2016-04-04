'use strict';
define(function() {
  return {
    update: function(peep) {
      peep.element.textContent = peep.name || peep.address;
    }
  };
});
