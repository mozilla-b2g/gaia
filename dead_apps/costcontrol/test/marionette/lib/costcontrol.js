/* global module */
(function(module) {
  'use strict';

  var ORIGIN_URL = 'app://costcontrol.gaiamobile.org';

  var SELECTORS = Object.freeze({
    DataUsageTab: {
      main: '#datausage-tab'
    },

    BalanceTab: {
      main: '#balance-tab'
    },

    TelephonyTab: {
      main: '#telephony-tab'
    },

    FirstTimeExperience: {
      frame: '#fte_view',
      main: '#firsttime-view',

      nextButton: 'button[data-navigation=next]:not([disabled])',
      backButton: 'button[data-navigation=back]',
      finishButton: 'button[data-navigation=finish]',

      Welcome: {
        main: '#step-1'
      },

      TypeOfContract: {
        main: '#step-2',
        prepaidPlanOption: '#prepaid-plan',
        postpaidPlanOption: '#postpaid-plan'
      },

      PrepaidLowBalanceAlert: {
        main: '#prepaid-step-2'
      },

      PrepaidDataReportAndAlert: {
        main: '#prepaid-step-3'
      },

      PostpaidPhoneAndDataReport: {
        main: '#postpaid-step-2'
      },

      PostpaidDataAlert: {
        main: '#postpaid-step-3'
      },

      DataReport: {
        main: '#non-vivo-step-1'
      },

      DataAlert: {
        main: '#non-vivo-step-2'
      }
    }
  });

  module.exports = {
    create: function(client) {
      return {
        BalanceTab: {
          get main() {
            return client.findElement(SELECTORS.BalanceTab.main);
          }
        },

        DataUsageTab: {
          get main() {
            return client.findElement(SELECTORS.DataUsageTab.main);
          }
        },

        TelephonyTab: {
          get main() {
            return client.findElement(SELECTORS.TelephonyTab.main);
          }
        },

        FirstTimeExperience: {
          get frame() {
            return client.findElement(SELECTORS.FirstTimeExperience.frame);
          },

          switchTo: function() {
            client.switchToFrame(this.frame);
            client.helper.waitForElement(SELECTORS.FirstTimeExperience.main);
          },

          Welcome: {
            get main() {
              return client.findElement(
                SELECTORS.FirstTimeExperience.Welcome.main
              );
            }
          },

          TypeOfContract: {
            get main() {
              return client.findElement(
                SELECTORS.FirstTimeExperience.TypeOfContract.main
              );
            },

            get prepaidPlanOption() {
              return client.helper.waitForElement(
                SELECTORS.FirstTimeExperience.TypeOfContract.prepaidPlanOption
              );
            },

            get postpaidPlanOption() {
              return client.helper.waitForElement(
                SELECTORS.FirstTimeExperience.TypeOfContract.postpaidPlanOption
              );
            }
          },

          PrepaidLowBalanceAlert: {
            get main() {
              return client.findElement(
                SELECTORS.FirstTimeExperience.PrepaidLowBalanceAlert.main
              );
            }
          },

          PrepaidDataReportAndAlert: {
            get main() {
              return client.findElement(
                SELECTORS.FirstTimeExperience.PrepaidDataReportAndAlert.main
              );
            }
          },

          PostPaidPhoneAndDataReport: {
            get main() {
              return client.findElement(
                SELECTORS.FirstTimeExperience.PostpaidPhoneAndDataReport.main
              );
            }
          },

           PostPaidDataAlert: {
            get main() {
              return client.findElement(
                SELECTORS.FirstTimeExperience.PostpaidDataAlert.main
              );
            }
          },

          DataReport: {
            get main() {
              return client.findElement(
                SELECTORS.FirstTimeExperience.DataReport.main
              );
            }
          },

          DataAlert: {
            get main() {
              return client.findElement(
                SELECTORS.FirstTimeExperience.DataAlert.main
              );
            }
          },

          getCurrentViewSelector: function() {
            var viewSelectors = [
              SELECTORS.FirstTimeExperience.Welcome.main,
              SELECTORS.FirstTimeExperience.TypeOfContract.main,
              SELECTORS.FirstTimeExperience.PrepaidLowBalanceAlert.main,
              SELECTORS.FirstTimeExperience.PrepaidDataReportAndAlert.main,
              SELECTORS.FirstTimeExperience.PostpaidPhoneAndDataReport.main,
              SELECTORS.FirstTimeExperience.PostpaidDataAlert.main,
              SELECTORS.FirstTimeExperience.DataReport.main,
              SELECTORS.FirstTimeExperience.DataAlert.main
            ];

            for(var i = 0; i < viewSelectors.length; i++) {
              if (client.findElement(viewSelectors[i]).displayed()) {
                return viewSelectors[i];
              }
            }

            throw new Error('First Time Experience view is not displayed!');
          },

          go: function(directionButtonSelector) {
            client.helper.waitForElement(
              this.getCurrentViewSelector() + ' ' + directionButtonSelector
            ).tap();
          },

          next: function() {
            this.go(SELECTORS.FirstTimeExperience.nextButton);
          },

          back: function() {
            this.go(SELECTORS.FirstTimeExperience.backButton);
          },

          finish: function() {
            this.go(SELECTORS.FirstTimeExperience.finishButton);
          }
        },

        launch: function() {
          client.switchToFrame();
          client.apps.launch(ORIGIN_URL);
          client.apps.switchToApp(ORIGIN_URL);
        },

        switchTo: function() {
          client.switchToFrame();

          client.apps.switchToApp(ORIGIN_URL);
        }
      };
    }
  };
})(module);
