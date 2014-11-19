/* global Service, BaseUI */
'use strict';

(function(exports) {
  function camalToDash(str) {
    var i = 0;
    var ch = '';
    while (i <= strings.length) {
      var character = strings.charAt(i);
      if (character !== character.toLowerCase()) {
        if (ch === '') {
          ch += character.toLowerCase();
        } else {
          ch += '-' + character.toLowerCase();
        }
      } else {
        ch += character;
      }
      i++;
    }
    return ch;
  };
  var BaseIconCollection = function(manager, constructor, count) {
    this.manager = manager;
    this.icons = [];
    for (var i = 0; i < count; i++) {
      this.icons[i] = new constructor(manager, i);
    }
    this.instanceID = constructor.instanceID;
    this.publish('created');
  };
  BaseIconCollection.prototype = Object.create(BaseIcon.prototype);
  BaseIconCollection.prototype.constructor = BaseIconCollection;
  BaseIconCollection.prototype.instanceID = 'statusbar-base';
  BaseIconCollection.prototype.role = 'presentation';
  BaseIconCollection.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  BaseIconCollection.prototype.start = function() {
    if (this._started) {
      return;
    }
    this._started = true;
    this.icons.forEach(function(icon) {
      icon.start();
    }, this);
    Service.registerState('isVisible', this);
    this.update();
  };
  BaseIconCollection.prototype.stop = function() {
    if (!this._started) {
      return;
    }
    this._started = false;
    this.icons.forEach(function(icon) {
      icon.stop();
    });
    Service.unregisterState('isVisible', this);
    this._stop();
  };
  BaseIconCollection.prototype.isVisible = function() {
    return this.icons.some(function(icon) {
      return icon.isVisible();
    });
  };
  BaseIconCollection.prototype.update = function() {
    this.icons.forEach(function(icon) {
      icon.update();
    }.bind(this));
  };
  exports.BaseIconCollection = BaseIconCollection;
}(window));
