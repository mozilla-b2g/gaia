/*exported MockInformation, MockGroupView, MockReportView */
'use strict';

function MockInformation(type) {
}

MockInformation.prototype = {
  show: function() {
    this.show.called = true;
  },
  refresh: function() {
    this.refresh.called = true;
  },
  reset: function() {
    this.reset.called = true;
  },
  mSetup: function() {
    this.show.called = false;
    this.refresh.called = false;
    this.reset.called = false;
  }
};

var MockGroupView = new MockInformation();
var MockReportView = new MockInformation();
