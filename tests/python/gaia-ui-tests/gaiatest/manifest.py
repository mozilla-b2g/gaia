# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import sys

import argparse
import pkg_resources
from py.xml import html, raw
from manifestparser import TestManifest


class Device(object):

    status = '--'
    tooltip = 'Test is not running on '

    def __init__(self, name):
        self.tooltip = self.tooltip + name


class ManifestParser():
    test_logs = []
    output = None
    # Get and use specific git commit path
    _test_href = 'https://github.com/mozilla-b2g/gaia/tree/master/tests/python/gaia-ui-tests/gaiatest/tests/'

    def __init__(self, manifest, tbpl_manifest):
        # read manifest
        self.manifest = TestManifest(manifests = (manifest,))

        self._hamachi = self.manifest.active_tests(device = 'msm7627a', b2g = True)
        self._travis = self.manifest.active_tests(device = 'desktop', b2g = True)

        #read tbpl
        tbpl_man = TestManifest(manifests = (tbpl_manifest,))
        self._tbpl = tbpl_man.active_tests(b2g = True)

        # merge main manifest with TBPL
        for test in tbpl_man.tests:
            add = True
            for te in self.manifest.tests:
                if te['path'] == test['path']:
                    add = False
            if add:
                self.manifest.tests.append(test)

    def _get_test(self, manifest, test_name):
        for test in manifest:
            if test_name in test['name']:
                return test

    def table_row(self, test):
        name = test['name'].split('/')[-1]
        class_name = os.path.basename(test['here'])
        path_name = test['here'].split('gaiatest')[1]

        link = self._test_href + test['relpath']
        class_link = self._test_href + os.path.dirname(test['relpath'])

        hamachi = Device('Hamachi')
        travis = Device('Travis')
        tbpl = Device('TBPL')

        hamachi_test = self._get_test(self._hamachi, name)
        travis_test = self._get_test(self._travis, name)
        tbpl_test = self._get_test(self._tbpl, name)

        if hamachi_test:
            if hamachi_test['expected'] == 'fail':
                hamachi.status = 'XFailed'
                hamachi.tooltip = 'Test is expected to fail'
            elif 'disabled' in hamachi_test.keys():
                hamachi.status = 'disabled'
                hamachi.tooltip = hamachi_test['disabled']
            elif hamachi_test['expected'] == 'pass':
                hamachi.status = 'enabled'
                hamachi.tooltip = 'Test is expected to pass'

        if travis_test:
            if travis_test['expected'] == 'fail':
                travis.status = 'XFailed'
                travis.tooltip = 'Test is expected to fail'
            elif 'disabled' in travis_test.keys():
                travis.status = 'disabled'
                travis.tooltip = travis_test['disabled']
            elif travis_test['expected'] == 'pass':
                travis.status = 'enabled'
                travis.tooltip = 'Test is expected to pass'

        if tbpl_test:
            if tbpl_test['expected'] == 'fail':
                tbpl.status  = 'XFailed'
                tbpl.tooltip = 'Test is expected to fail'
            elif 'disabled' in tbpl_test.keys():
                tbpl.status = 'disabled'
                tbpl.tooltip = tbpl_test['disabled']
            elif tbpl_test['expected'] == 'pass':
                tbpl.status = 'enabled'
                tbpl.tooltip = 'Test is expected to pass'

        self.test_logs.append(
            html.tr([
                        html.td(
                            html.a(name, href_ = link, target_ = '_blank'),
                            class_ = 'col-name', title = path_name),
                        html.td(
                            html.a(class_name, href_ = class_link, target_ = '_blank'),
                            class_ = 'col-class'),
                        html.td(hamachi.status, class_ = 'col-hamachi ' + hamachi.status, title_ = hamachi.tooltip),
                        html.td(travis.status, class_ = 'col-travis ' + travis.status, title_ = travis.tooltip),
                        html.td(tbpl.status, class_ = 'col-tbpl ' + tbpl.status, title_ = tbpl.tooltip)
                    ], class_ = 'results-table-row')
        )

    def generate_html(self):

        # generate table entry's
        for test in self.manifest.tests:
            self.table_row(test)

        # main HTML file
        doc = html.html(
            html.head(
                html.meta(charset='utf-8'),
                html.title('Test Report'),
                html.style(raw(pkg_resources.resource_string(
                    __name__, os.path.sep.join(['resources', 'report', 'style.css']))),
                    type='text/css')),
            html.body(
                html.script(raw(pkg_resources.resource_string(
                    __name__, os.path.sep.join(['resources', 'report', 'jquery.js']))),
                    type='text/javascript'),
                html.script(raw(pkg_resources.resource_string(
                    __name__, os.path.sep.join(['resources', 'report', 'main.js']))),
                    type='text/javascript'),
                html.h2('Test Status Mapping'),
                html.br(),
                html.p(
                    html.span('''The following table shows the functional Gaia UI tests and the targets they are currently run against.
                        Each test indicates the expected outcome from running the test.'''),
                    html.br(),
                    html.span('''Hover over the test name for the full path of the test file.
                Hover over the expected state to see if there's an associated reason'''),
                    ),
                html.br(),
                html.table([html.thead(
                    html.tr([
                        html.th('Test', rowspan_="2", colspan_="2"),
                        html.th('Device', colspan_="1"),
                        html.th('Desktop', colspan_="2")
                    ]),
                    html.tr([
                        html.th('Hamachi'),
                        html.th('Travis'),
                        html.th('TBPL')
                    ]),
                    html.tr([
                        html.th('Name', class_='sortable', col='name'),
                        html.th('Class', class_='sortable', col='class'),
                        html.th('State', class_='sortable', col='hamachi'),
                        html.th('State', class_='sortable', col='travis'),
                        html.th('State', class_='sortable', col='tbpl'),
                    ]), id='results-table-head'),
                    html.tbody(self.test_logs, id='results-table-body')], id='results-table')))

        return doc.unicode()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=str, default='tests/manifest.ini', help='Manifest file to read')
    parser.add_argument('--tbpl_manifest', type=str, default='tests/tbpl-manifest.ini', help='TBPL manifest file to read')
    parser.add_argument('--output', type=str, default='results/manifest_status.html', help='Output html file')
    args = parser.parse_args()

    if os.path.exists(args.manifest):
        manifest = args.manifest
    else:
        print 'Error: Could not find manifest file'
        exit(1)

    if os.path.exists(args.tbpl_manifest):
        tbpl_manifest = args.tbpl_manifest
    else:
        print 'Error: Could not find TBPL manifest file'
        exit(1)

    maifest_parser = ManifestParser(manifest, tbpl_manifest)

    html_dir = os.path.dirname(os.path.abspath(args.output))
    if not os.path.exists(html_dir):
        os.makedirs(html_dir)

    # Generate HTML file
    with open(args.output, 'w') as output:
        # change default encoding to avoid encoding problem for page source
        reload(sys)
        sys.setdefaultencoding('utf-8')
        output.write(maifest_parser.generate_html())

if __name__ == "__main__":
    main()
