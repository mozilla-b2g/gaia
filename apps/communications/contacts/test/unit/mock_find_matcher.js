var MockFindMatcher = {
  find: function(options) {
    this.result = [];

    if (options.filterBy.indexOf('tel') !== -1) {
      var value = options.filterValue;

      if (this.data.tel && this.data.tel[0].value === value) {
        this.result = [this.data];
      }
    }
    else if (options.filterBy.indexOf('email') !== -1) {
      var value = options.filterValue;
      if (this.data.email && this.data.email[0].value === value) {
        this.result = [this.data];
      }
    }
    return {
      result: this.result,
      set onsuccess(cb) {
        cb();
      }
    };
  },

  setData: function(data) {
    this.data = data;
  }
};
