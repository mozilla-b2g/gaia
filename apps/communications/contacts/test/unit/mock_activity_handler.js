'use strict';

var MockActivityHandler = {
  currentlyHandling: false,

  postPickSuccessParam: null,

  postPickSuccess: function postPickSuccess(param) {
    this.postPickSuccessParam = param;
  }
};
