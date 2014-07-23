# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

from setuptools import setup, find_packages

PACKAGE_VERSION = '0.1'

deps = ['corredor >= 0.1',
        'mozrunner >= 6.2',
        'mozprofile >= 0.21',
        'manifestparser >= 0.6']

setup(name='gaia-runner-service',
      version=PACKAGE_VERSION,
      description='A utility for running tests over a socket from JS to python',
      long_description='See https://github.com/mozilla-b2g/gaia/tree/master/tests/python/runner-service',
      classifiers=['Environment :: Console',
                   'Intended Audience :: Developers',
                   'License :: OSI Approved :: Mozilla Public License 2.0 (MPL 2.0)',
                   'Natural Language :: English',
                   'Operating System :: OS Independent',
                   'Programming Language :: Python',
                   'Topic :: Software Development :: Libraries :: Python Modules',
                   ],
      keywords='mozilla',
      author='Andrew Halberstadt',
      author_email='ahalberstadt@mozilla.com',
      license='MPL 2.0',
      packages=find_packages(),
      include_package_data=True,
      zip_safe=False,
      install_requires=deps,
      entry_points="""
        [console_scripts]
        gaia-integration=runner_service:runintegration.cli
      """)
