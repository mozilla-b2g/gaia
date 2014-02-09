var MockCallLogDBManager = {
  _calls: [],
  _getGroupListCursor: 0,
  // This is to emulate DB cursor for 'getGroupList'
  value: null,
  _getGroupListCallback: null,
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
  getGroupList: function getGroupList(callback) {
    this._getGroupListCursor = 0;
    this._getGroupListCallback = callback;
    this.continue();
  },
  deleteAll: function deleteAll(callback) {
    this._calls = [];
    callback();
  },
  continue: function mcldm_continue() {
    if (this._calls.length > this._getGroupListCursor) {
      this.value = this._calls[this._getGroupListCursor];
      this._getGroupListCursor++;
    } else {
      this.value = null;
    }
    if (this._getGroupListCallback != null) {
      this._getGroupListCallback(this);
    }
  }
};
