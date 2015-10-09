/**
 * PassPhrase storage helper.
 * 
 * @module PassPhrase
 * @return {Object}
 */
define([
  'shared/async_storage'
],

function(asyncStorage) {
  'use strict';

  var data = {};

  function result(value) {
    return {
      then: function(callback) {
        callback(value);
      }
    };
  }

  function PassPhrase(macDest, saltDest) {
    this.macDest = macDest;
    this.saltDest = saltDest;
  }

  PassPhrase.prototype = {

    exists: function() {
      return result(!!data[this.macDest]);
    },

    verify: function(password) {
      return result(data[this.macDest] === password);
    },

    change: function(password) {
      data[this.macDest] = password;
      return result(password);
    },

    clear: function() {
      data[this.macDest] = null;
      return result();
    }

  };


  return PassPhrase;

});
