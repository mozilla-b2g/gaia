# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os

from marionette import (BaseMarionetteOptions,
                        HTMLReportingOptionsMixin,
                        HTMLReportingTestRunnerMixin,
                        HTMLReportingTestResultMixin,
                        MarionetteTextTestRunner,
                        MarionetteTestResult,
                        BaseMarionetteTestRunner)
from marionette.runtests import cli
import mozlog

from gaiatest import __name__

from gaiatest import (GaiaTestCase,
                      GaiaOptionsMixin,
                      GaiaTestRunnerMixin,
                      TreeherderOptionsMixin,
                      TreeherderTestRunnerMixin,
                      GaiaImageCompareOptionsMixin)
from version import __version__


class GaiaTestOptions(BaseMarionetteOptions, GaiaOptionsMixin, HTMLReportingOptionsMixin,
                      TreeherderOptionsMixin, GaiaImageCompareOptionsMixin):

    def __init__(self, **kwargs):
        BaseMarionetteOptions.__init__(self, **kwargs)
        GaiaOptionsMixin.__init__(self, **kwargs)
        HTMLReportingOptionsMixin.__init__(self, **kwargs)
        TreeherderOptionsMixin.__init__(self, **kwargs)
        GaiaImageCompareOptionsMixin.__init__(self, **kwargs)


class GaiaTestResult(MarionetteTestResult, HTMLReportingTestResultMixin):

    def __init__(self, *args, **kwargs):
        MarionetteTestResult.__init__(self, *args, **kwargs)
        HTMLReportingTestResultMixin.__init__(self, *args, **kwargs)


class GaiaTextTestRunner(MarionetteTextTestRunner):

    resultclass = GaiaTestResult


class GaiaTestRunner(BaseMarionetteTestRunner, GaiaTestRunnerMixin,
                     HTMLReportingTestRunnerMixin, TreeherderTestRunnerMixin):

    textrunnerclass = GaiaTextTestRunner

    def __init__(self, **kwargs):
        # if no server root is specified, use the packaged resources
        if not kwargs.get('server_root'):
            kwargs['server_root'] = os.path.abspath(os.path.join(
                os.path.dirname(__file__), 'resources'))

        def gather_debug(test, status):
            rv = {}
            marionette = test._marionette_weakref()

            # In the event we're gathering debug without starting a session, skip marionette commands
            if marionette.session is not None:
                try:
                    marionette.switch_to_frame()
                    marionette.push_permission('settings-read', True)
                    marionette.push_permission('settings-api-read', True)
                    rv['settings'] = json.dumps(marionette.execute_async_script("""
  var req = window.navigator.mozSettings.createLock().get('*');
  req.onsuccess = function() {
    marionetteScriptFinished(req.result);
  }""", sandbox='system'), sort_keys=True, indent=4, separators=(',', ': '))
                except:
                    logger = mozlog.structured.get_default_logger()
                    if not logger:
                        logger = mozlog.getLogger('gaiatest')
                    logger.warning('Failed to gather test failure debug.', exc_info=True)
            return rv

        BaseMarionetteTestRunner.__init__(self, result_callbacks=[gather_debug], **kwargs)
        GaiaTestRunnerMixin.__init__(self, **kwargs)
        HTMLReportingTestRunnerMixin.__init__(self, name=__name__,
                                              version=__version__, **kwargs)
        TreeherderTestRunnerMixin.__init__(self, **kwargs)
        self.test_handlers = [GaiaTestCase]

    def start_httpd(self, need_external_ip):
        super(GaiaTestRunner, self).start_httpd(need_external_ip)
        if self.httpd is not None:
            self.httpd.urlhandlers.append({
                'method': 'GET',
                'path': '.*\.webapp',
                'function': self.webapp_handler})

    def webapp_handler(self, request):
        with open(os.path.join(self.server_root, request.path[1:]), 'r') as f:
            data = f.read()
        return (200, {
            'Content-type': 'application/x-web-app-manifest+json',
            'Content-Length': len(data)}, data)


def main():
    cli(runner_class=GaiaTestRunner, parser_class=GaiaTestOptions)
