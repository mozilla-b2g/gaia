/**
 * List installed replaceable home screens.
 */
define(require => {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var HomescreensList = require('panels/homescreens_list/homescreens_list');
  //var UpdateCheck = require('panels/homescreens_list/update_check');

  return function ctor_homescreens_panel() {
    var homescreensList = HomescreensList();
    //var updateCheck = UpdateCheck();

    return SettingsPanel({
      /**
       * @param {HTMLElement} panel The panel HTML element.
       */
      onInit: function hp_onInit(panel) {
        homescreensList.init({
          homescreensList: panel.querySelector('.my-home-screens'),
          moreLink: panel.querySelector('.get-more-home-screens')
        });

        /**
         * The markup for update check should look like:
            <li>
              <button class="check-update"
                data-l10n-id="check-homescreens-update"></button>
            </li>
            <li class="update-status description update-status">
              <p>
                <span class="general-information"
                  data-l10n-id="checking-for-update"></span>
                <span class="system-update-status"></span>
              </p>
            </li>
         */

        /*updateCheck.init({
          checkUpdateNow: panel.querySelector('.check-update'),
          updateStatus: panel.querySelector('.update-status'),
          systemStatus: panel.querySelector('.system-update-status')
        });*/
      },

      onBeforeShow: function hp_onBeforeShow() {
        homescreensList.listBuilder();
      }
    });
  };
});
