'use strict';
// We need to isolate these global variables from multiple testing files by
// using "requireApp" in order to prevent the conflict.

if (!window.PAGE_INDEX_DEFAULT) {
  window.PAGE_INDEX_DEFAULT = 0;
}

if (!window.InputMethods) {
  window.InputMethods = {};
}
