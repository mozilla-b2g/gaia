var MockFindMatcher = {
  find: function(options) {
    this.result = [];

    if (options.filterBy.indexOf('tel') !== -1) {
      var value = options.filterValue;

      var variantsValue = SimplePhoneMatcher.generateVariants(value);
      var variantsContact1 = [];
      var variantsContact2 = [];
      var found = false;
      if (this.data.tel && this.data.tel[0] && this.data.tel[0].value) {
        var telValue = this.data.tel[0].value;
        found = variantsValue.indexOf(
                          SimplePhoneMatcher.sanitizedNumber(telValue)) !== -1;
        if (!found) {
          var variantsContact1 =
            SimplePhoneMatcher.generateVariants(telValue);
          found = variantsContact1.indexOf(
                            SimplePhoneMatcher.sanitizedNumber(value)) !== -1;
        }
      }
      if (!found && this.data.tel && this.data.tel[1] &&
         this.data.tel[1].value) {
        var tel2Value = this.data.tel[1].value;
        found = variantsValue.indexOf(
                          SimplePhoneMatcher.sanitizedNumber(tel2Value)) !== -1;
        if (!found) {
          var variantsContact2 =
            SimplePhoneMatcher.generateVariants(tel2Value);
          found = variantsContact1.indexOf(
                            SimplePhoneMatcher.sanitizedNumber(value)) !== -1;
        }
      }

      if (found) {
        this.result = [this.data];
      }
    }
    else if (options.filterBy.indexOf('email') !== -1) {
      var value = options.filterValue;
      if (this.data.email && this.data.email[0].value === value ||
          this.data.email[1] && this.data.email[1].value === value) {
        this.result = [this.data];
      }
    }
    else if (options.filterBy.indexOf('familyName') !== -1) {
      var value = options.filterValue;
      if (this.data.familyName && this.data.familyName[0] === value) {
        this.result = [this.data];
      }
    }
    else if (options.filterBy.indexOf('name') !== -1) {
      var value = options.filterValue;
      if (this.data.name && this.data.name[0] === value) {
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

  save: function() {
    return {
      set onsuccess(cb) {
        cb();
      },
      set onerror(cb) {

      }
    };
  },

  remove: function() {
    return {
      set onsuccess(cb) {
        cb();
      },
      set onerror(cb) {

      }
    };
  },

  setData: function(data) {
    this.data = data;
  }
};
