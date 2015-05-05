define(function(require, exports, module) {
'use strict';

var nextTick = require('common/next_tick');

function PendingManager() {
  this.objects = [];
  this.pending = 0;
  this.onstart = this.onstart.bind(this);
  this.onend = this.onend.bind(this);
}
module.exports = PendingManager;

PendingManager.prototype = {
  register: function(object) {
    object.on(object.startEvent, this.onstart);
    object.on(object.completeEvent, this.onend);

    if (!this.isPending() && object.pending) {
      // Registering this object will make us pending.
      nextTick(() => this.onpending && this.onpending());
    }

    this.objects.push(object);
  },

  /**
   * Unregister an object.
   * Note it is intended that objects that
   * are unregistered are never in a state
   * where we are waiting for their pending
   * status to complete. If an incomplete
   * object is removed it will break .pending.
   */
  unregister: function(object) {
    this.objects = this.objects.filter(el => el !== object);
  },

  isPending: function() {
    return this.objects.some(object => object.pending);
  },

  onstart: function() {
    if (!this.pending) {
      this.onpending && this.onpending();
    }

    this.pending++;
  },

  onend: function() {
    this.pending--;
    if (!this.pending) {
      this.oncomplete && this.oncomplete();
    }
  }
};

});
