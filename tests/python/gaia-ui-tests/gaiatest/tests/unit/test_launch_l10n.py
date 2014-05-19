# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestLaunchL10n(GaiaTestCase):

    def test_launch_en_to_fr(self):
        '''
        Launch apps by English name in a different locale
        '''

        # set language to non-English
        self.data_layer.set_setting('language.current', 'fr')

        for app in ['Clock', 'Phone']:
            self.apps.launch(app)

        self.assertIn(u't\xe9l\xe9phone', [a.name.lower() for a in self.apps.running_apps])
        self.assertIn('horloge', [a.name.lower() for a in self.apps.running_apps])

    def test_launch_fr_to_fr(self):
        '''
        Launch apps by (non-English) localised name
        '''

        # set language to non-English
        self.data_layer.set_setting('language.current', 'fr')

        for app in ['Horloge', u't\xe9l\xe9phone']:
            self.apps.launch(app)

        self.assertIn(u't\xe9l\xe9phone', [a.name.lower() for a in self.apps.running_apps])
        self.assertIn('horloge', [a.name.lower() for a in self.apps.running_apps])
