/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global FTEWizard */
/* global ResourceLoader */
/* global SyncManagerBridge */

// XXX: If Firefox sign in is available outside of the browser app, we'll have
//      to remove or redesign FTE.

'use strict';

(function (exports) {

  if (localStorage.getItem('browserFTE.fteskip')) {
    return;
  }

  var FTE = {

    fteContainer: null,

    fteWizard: null,

    onuninit: function () {},

    init(options) {
      this.onuninit = options.onuninit;

      ResourceLoader.loadByName('fte')
      .then(node => {
        document.body.appendChild(node);

        this.fteContainer = document.getElementById('fte-container');

        this.fteWizard = new FTEWizard('browserFTE');
        this.fteWizard.init({
          container: this.fteContainer,
          propagateKeyEvent: true,
          onfinish: () => {
            SyncManagerBridge.enable();
            this.uninit();
          },
          onskip: () => {
            this.uninit();
          }
        });

        document.addEventListener('visibilitychange', this);
      });
    },

    handleEvent() {
      if (!document.hidden) {
        this.fteWizard.focus();
      }
    },

    uninit() {
      document.body.removeChild(this.fteContainer);
      document.removeEventListener('visibilitychange', this);
      ResourceLoader.unloadByName('fte');
      this.onuninit();
    }

  };

  exports.FTE = FTE;
  exports.FTE.init({onuninit: () => {
    delete exports.FTE;
  }});

})(window);
