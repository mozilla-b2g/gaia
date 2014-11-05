define(function(require, exports, module) {
'use strict';

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

    var wasPending = this.isPending();
    this.objects.push(object);
    if (object.pending) {
      this.pending++;

      if (!wasPending) {
        this.onpending && this.onpending();
      }
    }
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
    var idx = this.objects.indexOf(object);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
      return true;
    }

    return false;
  },

  isPending: function() {
    return this.objects.some((object) => {
      return object.pending;
    });
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
