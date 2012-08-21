var DEBUGGING = true;
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
