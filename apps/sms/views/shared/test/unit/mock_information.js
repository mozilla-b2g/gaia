/*exported MockInformation, MockGroupView, MockReportView */
'use strict';

function MockInformation(type) {
}

MockInformation.initDefaultViews = () => {};

MockInformation.prototype = {
  onDeliverySuccess: function() {},
  onReadSuccess: function() {},
  show: function() {},
  refresh: function() {},
  reset: function() {}
};

var MockGroupView = new MockInformation();
var MockReportView = new MockInformation();
