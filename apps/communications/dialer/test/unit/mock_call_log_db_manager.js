var MockCallLogDBManager = {
  _calls: [],
  add: function add(recentCall, callback) {
    this._calls.push(recentCall);
    var group = new Object();
    group.number = recentCall.number;
    if (callback) {
      callback(group);
    }
  },
  getGroupAtPosition: function getGroupAtPosition(
    position, sortedBy, prev, type, callback) {
    var found = false;
    this._calls.forEach(function(call) {
      if (call.type === type) {
        found = true;
        var group = new Object();
        group.number = call.number;
        callback(group);
        return false;
      }
    });
    if (!found && callback) {
      callback();
    }
  },
  deleteAll: function deleteAll(callback) {
    this._calls = [];
    callback();
  }
};
