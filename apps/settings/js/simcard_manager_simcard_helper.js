/* exported SimUIModel */

'use strict';

(function(exports) {

  var _ = window.navigator.mozL10n.get;

  /*
   * SimUIModel is a helper to help us map real card status
   * into needed virtual status, and SimCardManager will
   * be responsible for reflecting these virtual status
   * into real UI.
   */
  var SimUIModel = function(cardIndex) {
    this.cardIndex = cardIndex;

    /*
     * We have following states and would try to reflect them on
     * related UI. Take `locked` state for example, it doesn't mean
     * that this SIm is locked (we have to access icc.cardState
     * to make sure the SIM is locked), instead, it means that
     * SimCardManager has to show a small `locker` icon on the screen.
     *
     * The reason why we need this Model is because UX needs different
     * look and feel based on different cardState, in this way, I
     * think this would be better to use separate propeties to reflect
     * each UI on the screen so that we can change them easily.
     */
    this.enabled = false;
    this.absent = false;
    this.locked = false;
    this.name = 'SIM ' + (this.cardIndex + 1);
    this.number = '';
    this.operator = '';
  };

  SimUIModel.prototype = {
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
          this.enabled = false;
          this.absent = true;
          this.locked = false;
          this.number = '';
          this.operator = _('noSimCard');
          break;

        case 'locked':
          this.enabled = false;
          this.absent = false;
          this.locked = true;
          this.number = '';
          this.operator = _('sim-pin-locked');
          break;

        case 'blocked':
          this.enabled = true;
          this.absent = true;
          this.locked = false;
          this.number = '';
          this.operator = '';
          this.name = _('noSimCard');
          break;

        case 'normal':
          this.enabled = true;
          this.absent = false;
          this.locked = false;
          this.number = options.number;
          this.operator = options.operator;
          break;
      }
    }
  };

  exports.SimUIModel = SimUIModel;
})(window);
