var DEBUG_ID = 0;
var DEBUGGING = false;
var DEBUG_PREFIX = 'CC';
var debug = function(str) {
  if (!DEBUGGING)
    return;

  if (typeof str === 'object')
    str = JSON.stringify(str);

  var uId = DEBUG_ID++;
  if (window.dump) {
    window.dump(DEBUG_PREFIX +
                ' [' + window.parent.location.pathname + '] ' +
                ' [' + window.location.pathname + '] ' +
                ' (' + uId + '): ' + str + '\n');
  } else if (console && console.log) {
    console.log(DEBUG_PREFIX +
                ' [' + window.parent.location.pathname + '] ' +
                ' [' + window.location.pathname + '] ' +
                ' (' + uId + '): ' + str);
    if (arguments.length > 1)
      console.log.apply(this, arguments);
  }
};
