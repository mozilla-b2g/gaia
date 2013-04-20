'use strict';

function Mockalert(message) {
  Mockalert.mLastMessage = message;
}

Mockalert.mTeardown = function() {
  Mockalert.mLastMessage = null;
};

