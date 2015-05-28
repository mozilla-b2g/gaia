/**
 * Factory for generating ADB log parsers of a particular topic
 * @param {string} type When a log message is a match for the parser, emit an
 *                 event of this type
 * @param {function} matcher function that determines whether a log message will
 *                   be parsed
 * @param {function} parser function that accepts a log entry (object and returns
 *                   a parsed representation (object) for consumption
 * @returns {Function}
 */
module.exports = function(type, matcher, parser) {
  /**
   * Factoried function which accepts the log entry object and an EventEmitter
   * for relaying topic events
   */
  return function(entry, emitter) {
    // If the entry matches the format necessary for parsing, pass it to the
    // parser and receive back an object to be emitted for any listeners
    if (matcher(entry)) {
      return emitter.emit(type, parser(entry));
    }
  };
};
