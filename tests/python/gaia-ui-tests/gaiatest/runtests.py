# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os

from marionette import BaseMarionetteOptions, HTMLReportingOptionsMixin, \
    HTMLReportingTestRunnerMixin, EnduranceOptionsMixin, \
    HTMLReportingTestResultMixin
from marionette import MarionetteTestResult
from marionette import MarionetteTextTestRunner
from marionette import BaseMarionetteTestRunner
from marionette.runtests import cli

from gaiatest import GaiaTestCase, GaiaOptionsMixin, GaiaTestRunnerMixin
from version import __version__


class GaiaTestOptions(BaseMarionetteOptions, GaiaOptionsMixin,
                      EnduranceOptionsMixin, HTMLReportingOptionsMixin):

    def __init__(self, **kwargs):
        BaseMarionetteOptions.__init__(self, **kwargs)
        GaiaOptionsMixin.__init__(self, **kwargs)
        HTMLReportingOptionsMixin.__init__(self, **kwargs)
        EnduranceOptionsMixin.__init__(self, **kwargs)


class GaiaTestResult(MarionetteTestResult, HTMLReportingTestResultMixin):

    def __init__(self, *args, **kwargs):
        MarionetteTestResult.__init__(self, *args, **kwargs)
        HTMLReportingTestResultMixin.__init__(self, *args, **kwargs)


class GaiaTextTestRunner(MarionetteTextTestRunner):

    resultclass = GaiaTestResult


class GaiaTestRunner(BaseMarionetteTestRunner, GaiaTestRunnerMixin,
                     HTMLReportingTestRunnerMixin):

    textrunnerclass = GaiaTextTestRunner

    def __init__(self, **kwargs):
        # if no server root is specified, use the packaged resources
        if not kwargs.get('server_root'):
            kwargs['server_root'] = os.path.abspath(os.path.join(
                os.path.dirname(__file__), 'resources'))
        BaseMarionetteTestRunner.__init__(self, **kwargs)
        GaiaTestRunnerMixin.__init__(self, **kwargs)
        HTMLReportingTestRunnerMixin.__init__(self, name='gaiatest-v2.0', version=__version__, **kwargs)
        self.test_handlers = [GaiaTestCase]


def main():
    cli(runner_class=GaiaTestRunner, parser_class=GaiaTestOptions)
