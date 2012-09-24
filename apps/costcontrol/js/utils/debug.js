var DEBUGGING = false;
var DEBUG_PREFIX = 'CC: ';
var debug = function(str) {
  if (!DEBUGGING)
    return;

  if (window.dump)
    window.dump(DEBUG_PREFIX + str + '\n');
  if (console && console.log) {
    console.log(DEBUG_PREFIX + str);
    if (arguments.length > 1)
      console.log.apply(this, arguments);
  }
};

var _ = function cc_fallbackTranslation(keystring) {
  var r = navigator.mozL10n.get.apply(this, arguments);
  return r || (DEBUGGING ? '!!' : '') + keystring;
};
