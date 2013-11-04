import os
from setuptools import setup, find_packages

# get documentation from the README
try:
    here = os.path.dirname(os.path.abspath(__file__))
    description = file(os.path.join(here, 'README.md')).read()
except (OSError, IOError):
    description = ''

# version number
version = {}
execfile(os.path.join('gaiatest', 'version.py'), version)

# dependencies
deps = ['marionette_client>=0.6.1', 'mozdevice', 'py==1.4.14', 'requests',
        'moztest>=0.3']

setup(name='gaiatest',
      version=version['__version__'],
      description="Marionette test automation client for Gaia",
      long_description=description,
      classifiers=[],  # Get strings from http://pypi.python.org/pypi?%3Aaction=list_classifiers
      keywords='mozilla',
      author='Jonathan Griffin',
      author_email='jgriffin@mozilla.com',
      url='https://developer.mozilla.org/en-US/docs/Marionette',
      license='MPL',
      packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
      package_data={'gaiatest': [
          'atoms/*.js',
          'resources/report/jquery.js',
          'resources/report/main.js',
          'resources/report/style.css']},
      include_package_data=True,
      zip_safe=False,
      entry_points={'console_scripts': [
          'gaiatest = gaiatest.runtests:main',
          'gcli = gaiatest.gcli:cli']},
      install_requires=deps)
