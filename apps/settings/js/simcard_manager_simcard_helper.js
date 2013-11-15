/* exported SimCard */

'use strict';

(function(exports) {

  var _ = window.navigator.mozL10n.get;

  var SimCard = function(cardIndex) {
    this.cardIndex = cardIndex;

    // state list
    this.enabled = false;
    this.absent = false;
    this.locked = false;
    this.name = '';
    this.number = '';
    this.operator = '';
  };

  SimCard.prototype = {
    getInfo: function() {
      var keys = [
        'enabled', 'absent', 'locked',
        'name', 'number', 'operator'
      ];

      var info = {};
      keys.forEach(function(key) {
        info[key] = this[key];
      }.bind(this));

      return info;
    },
    setState: function(key, options) {
      switch (key) {
        case 'nosim':
          this.enabled = true;
          this.absent = true;
          this.locked = false;
          this.name = _('noSimCard');
          this.number = '';
          this.operator = '';
          break;

        case 'lock':
          this.enabled = true;
          this.absent = false;
          this.locked = true;
          this.name = 'simcard' + (this.cardIndex + 1);
          this.number = '';
          this.operator = '';
          break;

        case 'normal':
          this.enabled = true;
          this.absent = false;
          this.locked = options.locked;
          this.name = 'simcard' + (this.cardIndex + 1);
          this.number = options.number;
          this.operator = options.operator;
          break;

        case 'test':
          this.enabled = true;
          this.absent = false;
          this.locked = false;
          this.name = 'simcard' + (this.cardIndex + 1);
          this.number = '0123456789';
          this.operator = 'Chunghwa Telecom';
          break;

        // TODO
        // maybe we to extend the following states
        // to make sure number / name / operator
        // are all right.
        case 'enabled':
          this.enabled = true;
          break;

        case 'disabled':
          this.enabled = false;
          break;
      }
    }
  };

  exports.SimCard = SimCard;
})(window);
