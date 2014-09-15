/* Holds localized strings fo mailchew. mailbridge will set the values.
 * This is broken out as a separate module so that mailchew can be loaded
 * async as needed.
 **/

define(
  [
    'exports',
    'evt'
  ],
  function(
    exports,
    evt
  ) {

exports.events = new evt.Emitter();

exports.set = function set(strings) {
  exports.strings = strings;
  exports.events.emit('strings', strings);
};

});
