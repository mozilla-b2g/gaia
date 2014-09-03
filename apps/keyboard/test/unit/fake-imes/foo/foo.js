'use strict';

/* global InputMethods */

InputMethods.foo = {
  init: function(glue) {
    this._glue = glue;
  },
  activate: sinon.stub(),
  deactivate: sinon.stub(),
  click: sinon.stub(),
  selectionChange: sinon.stub(),
  surroundingtextChange: sinon.stub()
};
