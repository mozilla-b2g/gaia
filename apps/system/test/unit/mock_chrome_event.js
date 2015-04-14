'use strict';
/* exported MockChromeEvent */

function MockChromeEvent(detail) {
  this.type = 'mozChromeEvent';
  this.detail = detail;
}
