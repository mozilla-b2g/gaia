/*
 * SimUIModel is a helper to help us map real card status
 * into needed virtual status, and SimCardManager will
 * be responsible for reflecting these virtual status
 * into real UI.
 *
 * @module SimUIModel
 */
define(function(require) {
  'use strict';

  var SimUIModel = function(cardIndex) {
    this._cardIndex = cardIndex;

    /*
     * We have following states and would try to reflect them on
     * related UI. Take `locked` state for example, it doesn't mean
     * that this SIM is locked (we have to access icc.cardState
     * to make sure the SIM is locked), instead, it means that
     * SimCardManager has to show a small `locker` icon on the screen.
     *
     * The reason why we need this Model is because UX needs different
     * look and feel based on different cardState, in this way, I
     * think this would be better to use separate propeties to reflect
     * each UI on the screen so that we can change them easily.
     */
    this._enabled = false;
    this._absent = false;
    this._locked = false;
    this._defaultName = {
      id: 'simWithIndex',
      args: {
        index: this._cardIndex + 1
      }
    };
    this._name = this._defaultName;
    this._number = '';
    this._operator = null;
  };

  SimUIModel.prototype = {
    /**
     * We can get useful information stored in SimUIModel like
     * enabled, absent ... etc
     *
     * @memberOf SimUIModel
     * @access public
     * @return {Object} information about current SimUIModel
     */
    getInfo: function() {
      var keys = [
        'enabled', 'absent', 'locked',
        'name', 'number', 'operator'
      ];

      var info = {};
      keys.forEach(function(key) {
        info[key] = this['_' + key];
      }.bind(this));

      return info;
    },

    /**
     * With this method, you can update states on current SimUIModel.
     *
     * @memberOf SimUIModel
     * @access public
     * @param {String} key
     * @param {Object} options
     */
    setState: function(key, options) {
      switch (key) {
        case 'nosim':
          this._enabled = false;
          this._absent = true;
          this._locked = false;
          this._number = '';
          this._operator = {
            id: 'noSimCard'
          };
          this._name = this._defaultName;
          break;

        case 'locked':
          this._enabled = false;
          this._absent = false;
          this._locked = true;
          this._number = '';
          this._operator = {
            id: 'sim-pin-locked'
          };
          this._name = this._defaultName;
          break;

        case 'blocked':
          this._enabled = true;
          this._absent = true;
          this._locked = false;
          this._number = '';
          this._operator = null;
          this._name = {
            id: 'noSimCard'
          };
          break;

        case 'normal':
          this._enabled = true;
          this._absent = false;
          this._locked = false;
          this._number = options.number;
          if (options.operator) {
            this._operator = {
              text: options.operator
            };
          } else {
            this._operator = {
              id: 'no-operator'
            };
          }
          this._name = this._defaultName;
          break;
      }
    }
  };

  return function ctor_simUIModel(cardIndex) {
    return new SimUIModel(cardIndex);
  };
});
