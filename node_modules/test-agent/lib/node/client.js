var WSClient = require('../test-agent/websocket-client');

/**
 * Provides baseline client functionality.
 *
 *
 * @class
 * @constructor
 * @param {Options} options see options in test-agent/websocket-client.
 */
function Client(options) {
  WSClient.apply(this, arguments);
}

var proto = Client.prototype = Object.create(WSClient.prototype);


/**
 * Lists of names for events.
 *
 * @type Object
 */
proto.eventNames = {
  add: 'mirror events add',
  remove: 'mirror events remove',
  ack: 'mirror events ack'
};

/**
 * Enhances client with functionality from class or function.
 *
 *    Enhancement = function(options){}
 *    Enhancement.prototype.enhance = function enhance(server){
 *      //do stuff
 *    }
 *
 *    //second argument passed to constructor
 *    client.use(Enhancement, {isBlue: true});
 *
 *
 * @this
 * @param {Object} enhancement class.
 * @param {Object} options options for class.
 * @return {Object} self.
 */
proto.use = function use(enhancement, options) {
  new enhancement(options).enhance(this);
  return this;
};

/**
 * Sends a command to mirror server events.
 * Events from server will be mirrored to this client.
 *
 *
 * @param {Array} events list of events to mirror.
 * @param {Boolean} capture when true events will be suppressed \
 *                          on the server and sent to this client only.
 *
 * @this
 * @return {Object} self.
 */
proto.mirrorServerEvents = function mirrorServerEvents(events, capture) {
  var self = this;

  if (!events.forEach) {
    events = [events];
  }

  var send = {
    events: events,
    capture: capture || false
  };

  this.once(this.eventNames.ack, function(data) {
    self.mirrorAckId = data.id;
  });

  this.send(this.eventNames.add, send);

  return this;
};

module.exports = exports = Client;
