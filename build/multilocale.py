#!/usr/bin/env python

import os
import shutil
import fnmatch
import json
import re
from optparse import OptionParser
import logging
import platform

section_line = re.compile('\[(?P<section>.*)\]')
import_line = re.compile('@import url\((?P<filename>.*)\)')
property_line = re.compile('(?P<id>.*)\s*[:=]\s*(?P<value>.*)')

def _get_locales(filename):
    locales_list = json.load(open(filename), encoding="utf-8")
    return locales_list.keys()


def find_files(dirs, pattern):
    matches = []
    for dir in dirs:
        for current, dirnames, filenames in os.walk(dir):
            for filename in fnmatch.filter(filenames, pattern):
                matches.append(os.path.join(current, filename))
    return matches


def parse_manifest_properties(filename):
    with open(filename) as f:
        data = f.readlines()
    strings = {
        "default": {},
        "entry_points": {},
    }
    for line in data:
        m = property_line.search(line)
        if not m or line.strip().startswith('#'):
            continue
        value = m.group('value').strip()
        if '.' in m.group('id'):
            entry_point, key = m.group('id').split('.',1)
            if entry_point not in strings["entry_points"]:
                strings["entry_points"][entry_point] = {}
            strings["entry_points"][entry_point][key.strip()] = value
        else:
            key = m.group('id')
            strings["default"][key.strip()] = value
    return strings


def parse_ini(filename):
    log = logging.getLogger(__name__)
    with open(filename) as f:
        data = f.readlines()
    section = 'default'
    imports = { section: [] }
    for line in data:
        if line.strip() == "" or line.startswith('!') or line.startswith('#'):
            continue
        elif line.strip().startswith('['): # Section header
            section = section_line.search(line).group('section')
            imports[section] = []
        elif '@import' in line: # Import lines
            property_file = import_line.search(line).group('filename')
            imports[section].append(property_file)
        else:
            log.warn('parse_ini - found a line with contents '
                     'unaccounted for "%s"', line.strip())
    return imports


def serialize_ini(outfile, imports):
    def _section(locale):
        return "[%s]" % locale
    def _import(path):
        return "@import url(%s)" % path
    output = []
    for locale, paths in imports.items():
        if locale == "default":
            for path in paths:
                output.insert(0, _import(path))
            continue
        output.append(_section(locale))
        for path in paths:
            output.append(_import(path))
    with open(outfile, 'w') as o:
        o.write("\n".join(output))


def add_locale_imports(locales, ini_file):
    """Recreate an ini file with all locales sections"""
    log = logging.getLogger(__name__)
    imports = {
        "default": parse_ini(ini_file)["default"]
    }
    for locale in locales:
        log.info("adding %s to %s" % (locale, ini_file))
        imports[locale] = []
        for path in imports["default"]:
            locale_path = path.replace("en-US", locale)
            imports[locale].append(locale_path)
            log.debug("added %s" % locale_path)
    serialize_ini(ini_file, imports)
    log.info("updated %s saved" % ini_file)


def copy_properties(source, locales, ini_file):
    log = logging.getLogger(__name__)
    ini_dirname = os.path.dirname(ini_file)
    imports = parse_ini(ini_file)
    for locale in locales:
        log.info("copying %s files as per %s" % (locale, ini_file))
        for path in imports[locale]:
            target_path = os.path.join(ini_dirname, path)
            # apps/browser/locales/browser.fr.properties becomes
            # apps/browser/browser.properties
            source_path = target_path.replace(os.sep + 'locales', '') \
                                     .replace('.%s' % locale, '')
            source_path = os.path.join(source, locale, source_path)
            if not os.path.exists(source_path):
                log.warn('%s does not exist' % source_path)
                continue
            shutil.copy(source_path, target_path)
            log.debug("copied %s to %s" % (source_path, target_path))


def add_locale_manifest(source, locales, manifest_file):
    log = logging.getLogger(__name__)
    with open(manifest_file) as f:
        manifest = json.load(f, encoding="utf-8")
    for locale in locales:
        log.info("adding %s to %s" % (locale, manifest_file))
        manifest_properties = os.path.join(source, locale,
                                           os.path.dirname(manifest_file), 
                                           'manifest.properties')
        log.debug("getting strings from %s" % manifest_properties)
        if not os.path.exists(manifest_properties):
            log.warn("%s does not exist" % manifest_properties)
            continue
        strings = parse_manifest_properties(manifest_properties)
        if "entry_points" in manifest:
            for name, ep in manifest["entry_points"].items():
                if "locales" not in ep:
                    continue
                log.debug("adding to entry_points.%s.locales" % name)
                if name not in strings["entry_points"]:
                    log.warn("%s.* strings are missing from %s" %
                                (name, manifest_properties))
                    continue
                ep["locales"][locale] = {}
                ep["locales"][locale].update(strings["entry_points"][name])
        if "inputs" in manifest:
            for name, ep in manifest["inputs"].items():
                if "locales" not in ep:
                    continue
                log.debug("adding to inputs.%s.locales" % name)
                if name not in strings["entry_points"]:
                    log.warn("%s.* strings are missing from %s" %
                                (name, manifest_properties))
                    continue
                ep["locales"][locale] = {}
                ep["locales"][locale].update(strings["entry_points"][name])
        if "locales" in manifest:
            log.debug("adding to locales")
            manifest["locales"][locale] = {}
            manifest["locales"][locale].update(strings["default"])
    f.close()
    with open(manifest_file, 'w') as o:
        json.dump(manifest, o, encoding="utf-8", indent=2)
    log.debug("updated %s saved" % manifest_file)


def setup_logging(volume=1, console=True, filename=None):
    logger = logging.getLogger(__name__)
    levels = [logging.DEBUG,
              logging.INFO,
              logging.WARNING,
              logging.ERROR,
              logging.CRITICAL][::1]
    if volume > len(levels):
        volume = len(levels) - 1
    elif volume < 0:
        volume = 0
    logger.setLevel(levels[len(levels)-volume])
    if console:
        console_handler = logging.StreamHandler()
        console_formatter = logging.Formatter('%(levelname)s: %(message)s')
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
    if filename:
        file_handler = logging.FileHandler(filename)
        file_formatter = logging.Formatter('%(asctime) - %(levelname)s: %(message)s')
        file_handler.addFormatter(file_formatter)
        logger.addHandler(file_handler)


def make_relative(path, gaia):
    if platform.system() is 'Windows':
        gaia = gaia.replace('\\\\', '\\')
    return path[len(gaia)+1:]


def main():
    parser = OptionParser("%prog [OPTIONS] [LOCALES...] - create multilocale Gaia")
    parser.add_option("-v", "--verbose", 
                      action="count", dest="verbose", default=2,
                      help="use more to make louder")
    parser.add_option("-i", "--ini", 
                      action="store_true", dest="onlyini",  default=False,
                      help=("just edit the ini files and exit; "
                            "use this with DEBUG=1 make profile"))
    parser.add_option("--target", 
                      action="append", dest="target",
                      help=("path to directory to make changes in "
                            "(more than one is fine)"))
    parser.add_option("--source", 
                      action="store", dest="source",
                      help="path to the l10n basedir")
    parser.add_option("--config", 
                      action="store", dest="config_file",
                      help=("path to the languages.json config file; "
                            "will be used instead of LOCALES"))
    parser.add_option("--gaia",
                      action="store", dest="gaia",
                      help="path to gaia directory")

    options, locales = parser.parse_args()

    setup_logging(volume=options.verbose)
    log = logging.getLogger(__name__)

    if options.config_file is not None:
        locales = _get_locales(options.config_file)
        log.debug("config file specified; ignoring any locales passed as args")
    elif len(locales) == 0:
        parser.error("You need to specify --config or pass the list of locales")
    if options.target is None:
        parser.error("You need to specify at least one --target")
    if options.source is None and not options.onlyini:
        parser.error("You need to specify --source (unless you meant --ini)")
    if options.gaia is None:
        parser.error("You need to specify --gaia")

    if "en-US" in locales:
        locales.remove("en-US")
    ini_files = find_files(options.target, "*.ini")

    # 1. link properties files from the inis
    for ini_file in ini_files:
        log.info("########## adding locale import rules to %s" % ini_file)
        add_locale_imports(locales, ini_file)

    if options.onlyini:
        parser.exit(1)

    # 2. copy properties files as per the inis
    for ini_file in ini_files:
        log.info("########## copying locale files as per %s" % ini_file)
        ini_file = make_relative(ini_file, options.gaia)
        copy_properties(options.source, locales, ini_file)

    # 3. edit manifests
    manifest_files = find_files(options.target, 'manifest.webapp')
    for manifest_file in manifest_files:
        log.info("########## adding localized names to %s" % manifest_file)
        manifest_file = make_relative(manifest_file, options.gaia)
        add_locale_manifest(options.source, locales, manifest_file)


if __name__ == "__main__":
    main()
