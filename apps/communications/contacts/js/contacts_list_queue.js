'use strict';

var contacts = window.contacts || {};
contacts.List = contacts.List || {};
contacts.List.Queue = (function(opt) {

  var DEFAULT_FLUSH_SIZE = 40;

  // Construct a new contact "queue".  This object allows contacts to be
  // pushed into ordered lists according to group.  The contacts can then
  // be flushed to the DOM in an orderly fashion.  Access to the DOM is
  // provided by function handles passed in to the constructor.
  //
  // Option values:
  //  getViewport:        Required function that returns the scrollable viewport
  //                      DOM node.
  //  getGroupList:       Required function that takes a group and returns the
  //                      DOM node containing the group list.
  //  createNode:         Required function that takes a contact and a group and
  //                      returns the DOM node which should be used to represent
  //                      the contact.
  //  appendToGroupList:  Required function that takes a group and a DOM node to
  //                      append to that group.  The node may be a fragment
  //                      containing many nodes.
  //  flushSize:          Optional number specifying the default number of
  //                      contacts to flush at one time.  (Defaults to 40.)
  //  before:             Optional function that will be called prior to
  //                      performing one or more appendToGroup calls.
  //  after:              Optional function that will be called after performing
  //                      one or more appendToGroup calls.  Passed the number of
  //                      contacts flushed since the last before() call.
  function Queue(opt) {
    var self = (this instanceof Queue) ? this : Object.create(Queue.prototype);

    opt = opt || {};

    // Required values
    self.getViewport = opt.getViewport;
    self.getGroupList = opt.getGroupList;
    self.createNode = opt.createNode;
    self.appendToGroupList = opt.appendToGroupList;

    if (typeof self.getViewport !== 'function')
      throw new Error('contacts.List.Queue requires getViewport()');
    if (typeof self.getGroupList !== 'function')
      throw new Error('contacts.List.Queue requires getGroupList()');
    if (typeof self.createNode !== 'function')
      throw new Error('contacts.List.Queue requires createNode()');
    if (typeof self.appendToGroupList !== 'function')
      throw new Error('contacts.List.Queue requires appendToGroupList()');

    // Optional values
    self.flushSize = opt.flushSize || DEFAULT_FLUSH_SIZE;
    self.before = opt.before || function() {};
    self.after = opt.after || function() {};

    self.reset();

    return self;
  }

  // Reset the queue.  If a flush is scheduled on the timer it may still fire
  // for the old data.
  Queue.prototype.reset = function push() {
    this.queues = {};
    this.flushed = {};
    this.flushing = [];
    this.scheduled = false;
  };

  // Try to push a contact on to the queue for the given group.  This function
  // treats the contacts using simple queue semantics and does not check for
  // duplicates.  If the queue has already been flushed, then ignore the
  // contact and return false.  Otherwise, queue the contact and return true.
  Queue.prototype.push = function push(group, contact) {
    // Don't add items to a queue that has already been flushed.
    if (!group || !contact || this.flushed[group])
      return false;

    if (!this.queues[group])
      this.queues[group] = [];

    this.queues[group].push(contact);
    return true;
  };

  // Flush contacts from the given group to the DOM.  If numToFlush is passed,
  // then it is used as the limit on the number of contacts to flush.
  // Otherwise flush our default number of contacts.  Returns the total number
  // of contacts flushed.
  Queue.prototype.flush = function flush(group, numToFlush) {
    this.before();
    var numFlushed = this._flush(group, numToFlush || this.flushSize);
    this.after(numFlushed);
    return numFlushed;
  };

  // Schedule a flush of the given group to occur asynchronously.  In this
  // case the flush will begin on the next tick and then continue every
  // tick until the queue is empty.
  Queue.prototype.flushLater = function flushLater(group) {
    if (this.flushed[group] || this.flushing.indexOf(group) >= 0)
      return;

    this.flushing.push(group);
    this._scheduleFlushTimer();
  };

  // Flush all of the contacts in all of the queues right now.  Returns the
  // number of contacts flushed.
  Queue.prototype.flushAll = function flushAll() {
    this.before();

    var numFlushed = 0;
    var groups = Object.keys(this.queues);
    for (var i = 0, n = groups.length; i < n; ++i) {
      var group = groups[i];
      while (!this.flushed[group]) {
        numFlushed += this._flush(group, MAX_INT);
      }
    }

    this.after(numFlushed);

    return numFlushed;
  };

  //-------------------------------------------------------------------------
  // Private
  //-------------------------------------------------------------------------

  // Convenience constant used when specifying all items in a list.
  var MAX_INT = 0x7fffffff;

  // Utility function that performs the actual flush logic.
  Queue.prototype._flush = function _flush(group, numToFlush) {
    var groupList = this.getGroupList(group);
    if (!groupList)
      return 0;

    var queue = this.queues[group];
    if (!queue || !queue.length) {
      this.flushed[group] = true;
      return 0;
    }

    // Determine if we will need to adjust the scroll position of the
    // list after adding nodes.  This is necessary if we are appending
    // nodes that will appear before or within the current view's position.
    var listHeight = groupList.offsetHeight;
    var listBottom = groupList.offsetTop + listHeight;
    var viewport = this.getViewport();
    var viewBottom = viewport.scrollTop + viewport.clientHeight;
    var needScrollAdjust = listBottom < viewBottom;

    var count = 0;

    // Append placeholders in a single DOM operation using a fragment.
    var fragment = document.createDocumentFragment();
    while (queue.length && count < numToFlush) {
      var contact = queue.shift();
      var node = this.createNode(contact, group);
      fragment.appendChild(node);
      count += 1;
    }
    this.appendToGroupList(groupList, fragment);

    // Fix the scroll position if we determined it was necessary earlier.
    if (needScrollAdjust) {
      var shifted = groupList.offsetHeight - listHeight;
      viewport.scrollTop += shifted;
    }

    // If we have completely drained the queue, then mark this queue as
    // flushed.  All future nodes for this group will go straight to the
    // DOM.
    this.flushed[group] = !queue.length;

    return count;
  };

  // Utility function to schedule the flush timer if it is not already
  // scheduled.
  Queue.prototype._scheduleFlushTimer = function _scheduleFlushTimer() {
    var self = this;

    if (self.scheduled || !self.flushing.length)
      return;

    LazyLoader.load(['/shared/js/zero_timeout.js'], function() {
      setZeroTimeout(self._flushTimer.bind(self));
    });
    self.scheduled = true;
  };

  // Utility function representing the logic run on from the timer.
  Queue.prototype._flushTimer = function _flushTimer() {
    this.scheduled = false;
    if (!this.flushing.length)
      return;

    var numFlushed = 0;

    this.before();

    while (numFlushed < this.flushSize && this.flushing.length) {
      var group = this.flushing[0];
      numFlushed += this._flush(group, this.flushSize - numFlushed);
      if (this.flushed[group])
        this.flushing.shift();
    }

    this.after(numFlushed);

    this._scheduleFlushTimer();
  };

  return Queue;
})();
