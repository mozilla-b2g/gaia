/**
 * PageTransitions provides transition functions used when navigating panels.
 *
 * @module PageTransitions
 */
define(function() {
  'use strict';

  var _sendPanelReady = function _send_panel_ready(oldPanelHash, newPanelHash) {
    var detail = {
      previous: oldPanelHash,
      current: newPanelHash
    };
    var event = new CustomEvent('panelready', {detail: detail});
    window.dispatchEvent(event);
  };

  return {
    /**
     * Typically used with phone size device layouts.
     *
     * @alias module:PageTransitions#oneColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    oneColumn: function pt_one_column(oldPanel, newPanel, callback) {
      // switch previous/current classes
      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
      }
      if (newPanel.className === 'current') {
        if (callback) {
          callback();
        }
        return;
      }

      newPanel.className = 'current';

      /**
       * Most browsers now scroll content into view taking CSS transforms into
       * account.  That's not what we want when moving between <section>s,
       * because the being-moved-to section is offscreen when we navigate to its
       * #hash.  The transitions assume the viewport is always at document 0,0.
       * So add a hack here to make that assumption true again.
       * https://bugzilla.mozilla.org/show_bug.cgi?id=803170
       */
      if ((window.scrollX !== 0) || (window.scrollY !== 0)) {
        window.scrollTo(0, 0);
      }

      newPanel.addEventListener('transitionend', function paintWait() {
        newPanel.removeEventListener('transitionend', paintWait);

        // We need to wait for the next tick otherwise gecko gets confused
        setTimeout(function nextTick() {
          if (oldPanel) {
            _sendPanelReady('#' + oldPanel.id, '#' + newPanel.id);

            // Bug 818056 - When multiple visible panels are present,
            // they are not painted correctly. This appears to fix the issue.
            // Only do this after the first load
            if (oldPanel.className === 'current') {
              return;
            }
          } else {
            _sendPanelReady(null, '#' + newPanel.id);
          }

          if (callback) {
            callback();
          }
        });
      });
    },

    /**
     * Typically used with tablet size device layouts.
     *
     * @alias module:PageTransitions#twoColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    twoColumn: function pt_two_column(oldPanel, newPanel, callback) {
      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
        newPanel.className = 'current';
        _sendPanelReady('#' + oldPanel.id, '#' + newPanel.id);
      } else {
        newPanel.className = 'current';
        _sendPanelReady(null, '#' + newPanel.id);
      }

      if (callback) {
        callback();
      }
    }
  };
});
