/*exported MockInformation, MockGroupView, MockReportView */
'use strict';

function MockInformation(type) {
}

MockInformation.prototype = {
  show: function() {
    this.show.called = true;
  },
  reset: function() {
    this.reset.called = true;
  }
};

var MockGroupView = new MockInformation();
var MockReportView = new MockInformation();
