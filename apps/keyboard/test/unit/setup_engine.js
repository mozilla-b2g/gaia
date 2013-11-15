// We need to isolate these global variables from multiple testing files by
// using "requireApp" in order to prevent the conflict.

if (!window.LAYOUT_PAGE_DEFAULT)
  window.LAYOUT_PAGE_DEFAULT = 'Default';

if (!window.InputMethods)
  window.InputMethods = {};
