# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from marionette import MarionetteTestRunner
from marionette.runtests import cli


class GaiaTestRunner(MarionetteTestRunner):

    def register_handlers(self):
        self.test_handlers.extend([GaiaTestCase])


def main():
    cli(runner_class=GaiaTestRunner)


if __name__ == "__main__":
    main()
