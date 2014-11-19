# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import sys
import time

import argparse
import pkg_resources
from marionette.runner.mixins.xmlgen import html
from marionette.runner.mixins.xmlgen import raw

from manifestparser import TestManifest


class Device(object):
    status = '--'
    tooltip = 'Test is not running on '

    def __init__(self, name):
        self.tooltip = self.tooltip + name


class ManifestParser():
    test_logs = []
    output = None

    def __init__(self, manifest, git_link, git_branch):
        # generate git path
        self._test_href = git_link + 'tree/' + git_branch + '/tests/python/gaia-ui-tests/gaiatest/tests/'

        # read manifest
        self.manifest = TestManifest(manifests=(manifest,))

        self._flame = self.manifest.active_tests(b2g=True, device='Flame')

        # read tree herder
        self._desktop = self.manifest.active_tests(b2g=True, device='desktop')

    def _get_test(self, manifest, test_name):
        for test in manifest:
            if test_name in test['name']:
                return test

    def table_row(self, test):
        name = test['name'].split('/')[-1]
        suite_name = test['relpath'].split('/')[0]
        app_name = os.path.basename(test['here'])
        path_name = test['here'].split('gaiatest')[1]

        link = self._test_href + test['relpath']
        run_link = self._test_href + suite_name
        class_link = self._test_href + os.path.dirname(test['relpath'])

        flame = Device('Flame')

        desktop = Device('desktop')

        flame_test = self._get_test(self._flame, name)
        desktop_test = self._get_test(self._desktop, name)

        if flame_test:
            if flame_test['expected'] == 'fail':
                flame.status = 'XFailed'
                flame.tooltip = 'Test is expected to fail'
            elif 'disabled' in flame_test.keys():
                flame.status = 'Disabled'
                flame.tooltip = flame_test['disabled']
            elif flame_test['expected'] == 'pass':
                flame.status = 'Enabled'
                flame.tooltip = 'Test is expected to pass'

        if desktop_test:
            if desktop_test.has_key('skip-if') and 'device == "desktop"' in desktop_test['skip-if']:
                pass
            elif desktop_test['expected'] == 'fail':
                desktop.status = 'XFailed'
                desktop.tooltip = 'Test is expected to fail'
            elif 'disabled' in desktop_test.keys():
                desktop.status = 'Disabled'
                desktop.tooltip = desktop_test['disabled']
            elif desktop_test['expected'] == 'pass':
                desktop.status = 'Enabled'
                desktop.tooltip = 'Test is expected to pass'

        self.test_logs.append(
            html.tr([
                html.td(
                    html.a(name, href_=link, target_='_blank'),
                        class_='col-name', title=path_name),
                    html.td(
                        html.a(suite_name, href_=run_link, target_='_blank'),
                        class_='col-run'),
                    html.td(
                        html.a(app_name, href_=class_link, target_='_blank'),
                        class_='col-class'),
                    html.td(flame.status, class_='col-flame ' + flame.status, title_=flame.tooltip),
                    html.td(desktop.status, class_='col-desktop ' + desktop.status,
                            title_=desktop.tooltip)
                    ], class_='results-table-row')
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
                    html.br(),
                    html.br(),
                    html.span('Generated on: %s' % time.strftime("%c"))
                ),
                html.br(),
                html.table([html.thead(
                    html.tr([
                        html.th('Test', rowspan_="2", colspan_="3"),
                        html.th('Device', colspan_="1"),
                        html.th('Desktop', colspan_="1")
                    ]),
                    html.tr([
                        html.th('Flame'),
                        html.th('Desktop')
                    ]),
                    html.tr([
                        html.th('Name', class_='sortable', col='name'),
                        html.th('Run', class_='sortable', col='run'),
                        html.th('Class', class_='sortable', col='class'),
                        html.th('State', class_='sortable', col='flame'),
                        html.th('State', class_='sortable', col='desktop'),
                    ]), id='results-table-head'),
                    html.tbody(self.test_logs, id='results-table-body')], id='results-table')))

        return doc.unicode()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=str, default='tests/manifest.ini', help='Manifest file to read')
    parser.add_argument('--output', type=str, default='results/manifest_status.html', help='Output html file')
    parser.add_argument('--git-link', type=str, default='https://github.com/mozilla-b2g/gaia/',
                        help='Link to GitHub repository')
    parser.add_argument('--git-branch', type=str, default='master', help='GitHub branch')
    args = parser.parse_args()

    if os.path.exists(args.manifest):
        manifest = args.manifest
    else:
        print 'Error: Could not find manifest file'
        exit(1)

    git_link = args.git_link
    git_branch = args.git_branch
    manifest_parser = ManifestParser(manifest, git_link, git_branch)

    html_dir = os.path.dirname(os.path.abspath(args.output))
    if not os.path.exists(html_dir):
        os.makedirs(html_dir)

    # Generate HTML file
    with open(args.output, 'w') as output:
        # change default encoding to avoid encoding problem for page source
        reload(sys)
        sys.setdefaultencoding('utf-8')
        output.write(manifest_parser.generate_html())


if __name__ == "__main__":
    main()
