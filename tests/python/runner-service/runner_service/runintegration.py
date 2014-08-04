# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import subprocess
import sys
import tempfile

from manifestparser import TestManifest

from .arguments import GaiaIntegrationParser
from .handlers import runner_handlers
from .listener import SocketListener

here = os.path.abspath(os.path.dirname(__file__))
gaia_dir = os.path.abspath(os.path.join(here, '../../../../'))

class GaiaIntegrationRunner(object):

    def __init__(self, manifest=None):
        self.manifest = manifest or os.path.join(gaia_dir, 'shared', 'test',
                                                 'integration', 'manifest.ini')
        if self.manifest.endswith('.ini'):
            self.manifest = self.convert_ini_manifest_to_json(self.manifest)

    def run_gi(self):
        command = ['make', 'test-integration-test',
                   'REPORTER=mocha-socket-reporter',
                   'MARIONETTE_RUNNER_HOST=marionette-socket-host',
                   'TEST_MANIFEST=%s' % self.manifest,]
        # TODO use mozprocess?
        self.proc = subprocess.Popen(command, cwd=gaia_dir)

    @classmethod
    def convert_ini_manifest_to_json(cls, manifest_path):
        manifest = TestManifest([manifest_path])

        whitelist = [t['path'] for t in manifest.active_tests(disabled=False)]
        blacklist = [t for t in manifest.paths() if t not in whitelist]

        whitelist.insert(0, os.path.join(gaia_dir, 'shared', 'test', 'integration', 'setup.js'))

        map(lambda l: [os.path.relpath(p, gaia_dir) for p in l] , (whitelist, blacklist))
        contents = { 'whitelist': whitelist }

        manifest_path = tempfile.NamedTemporaryFile(suffix='.json').name
        with open(manifest_path, 'w') as f:
            f.writelines(json.dumps(contents, indent=2))
        return manifest_path

    def cleanup(self):
        if self.proc:
            self.proc.kill()


def cli(args=sys.argv[1:]):
    parser = GaiaIntegrationParser()
    args = parser.parse_args(args)

    rhandler_args = {
        'symbols_path': args.symbols_path,
    }
    if args.b2g_home:
        rhandler_args['b2g_home'] = args.b2g_home
    rhandler = runner_handlers[args.buildapp](**rhandler_args)

    listener = SocketListener()
    listener.add_runner_handler(rhandler)

    integration = GaiaIntegrationRunner(manifest=args.manifest)
    integration.run_gi()

    try:
        listener.poll()
    finally:
        integration.cleanup()
        listener.cleanup()
        #rhandler.cleanup()

if __name__ == '__main__':
    sys.exit(cli())
