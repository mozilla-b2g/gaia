# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

from setuptools import setup, find_packages
# NOTE: import the following due to linux bug http://bugs.python.org/issue15881
try:
    import multiprocessing
except ImportError:
    pass

PACKAGE_VERSION = '0.3'

deps = ['mozrunner >= 6.6',
        'mozprofile >= 0.21']

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
