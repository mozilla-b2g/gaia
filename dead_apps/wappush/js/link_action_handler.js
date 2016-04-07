/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global ActivityPicker */

(function(exports) {
  'use strict';

  var inProgress = false;

  var LinkActionHandler = {
    onClick: function lah_onClick(event) {
      var dataset = event.target.dataset;
      var action = dataset.action;
      var type;

      event.preventDefault();

      if (!action) {
        return;
      }

      /* To avoid activity pile up, return immediately if the last activity is
       * still in progress. */
      if (inProgress) {
        return;
      }

      inProgress = true;

      type = action.replace('-link', '');

      /* Use `LinkActionHandler.reset` (this.reset) as BOTH the success and
       * error callback. This ensure that any activities will be freed
       * regardless of their resulting state. */

      ActivityPicker[type](
        dataset[type], this.reset, this.reset
      );
    },

    reset: function lah_reset() {
      inProgress = false;
    }
  };

  exports.LinkActionHandler = LinkActionHandler;
}(this));
