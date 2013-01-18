'use strict';

function MockChromeEvent(detail) {
  return new CustomEvent('mozChromeEvent', { detail: detail });
}
