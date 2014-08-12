/**
  Copyright 2012, Mozilla Foundation

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

'use strict';

/**
 * To prevent missing events, all incoming event would be pushed into
 * this queue, and then handle them when the current stack is empty.
 *
 * This queue would forward all events to the real handler when it's ready.
 * In other words, user must pass it's handler and list of events to
 * do the work.
 */
(function(exports) {
  var LockScreenEventQueue = function() {};

  /**
   * @param eventList {[string]} - all event would be handled by the handler
   * @param handler {function} - the 'handleEvent' function; must be bound
   */
  LockScreenEventQueue.prototype.start =
  function lseq_start(eventList, handler) {
    this.intervalID = null;
    this.eventList = eventList;
    this.handler = handler;
    this.queue = [];

    this.eventList.forEach((ename) => {
      window.addEventListener(ename, this);
    });
    return this;
  };

  LockScreenEventQueue.prototype.handleEvent =
  function lseq_handleEvent(evt) {
    this.queue.push(() => {
      this.handler(evt);
    });
    if (!this.intervalID) {
      setInterval(() => {
        if (0 === this.queue.length) {
          clearInterval(this.intervalID);
          this.intervalID = null;
        } else {
          var handle = this.queue.pop();
          handle();
        }
      }, 0);
    }
    return this;
  };

  LockScreenEventQueue.prototype.stop =
  function lseq_stop() {
    this.queue.length = 0;
    this.eventList.forEach((ename) => {
      window.removeEventListener(ename, this);
    });
    return this;
  };
  exports.LockScreenEventQueue = LockScreenEventQueue;
})(window);
