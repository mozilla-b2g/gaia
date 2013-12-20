function MockNotificationObject(id) {
  this.id = id;
}

MockNotificationObject.prototype.close = function() {
};

var MockNotificationAPI = {
  get: function mockNotificationAPI_get() {
    return {
      then: function(onSuccess, onError, onProgress) {
        onSuccess([
          new MockNotificationObject('1'),
          new MockNotificationObject('2')
        ]);
      }
    };
  }
};
