var MockFbContacts = {
  mResult: null,

  search: function(by, number) {
    return {
      result: this.mResult,
      set onsuccess(cb) {
        cb();
      }
    };
  }
};
