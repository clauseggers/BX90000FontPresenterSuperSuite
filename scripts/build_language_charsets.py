#!/usr/bin/env python3
"""
scripts/build_language_charsets.py

Reads every .txt file in http_root/corpus/words/ and produces
http_root/corpus/words/language_charsets.json

The JSON has the shape:
  {
    "german":  [65, 228, 246, 252, ...],
    "french":  [65, 224, 226, ...],
    ...
  }

Each array contains the sorted, unique Unicode codepoints found in that
language's word list file.  Control characters and ASCII space (U+0020)
are excluded.

Run via:  npm run build:charsets
      or:  python3 scripts/build_language_charsets.py
"""

import json
import os
import sys

WORDS_DIR   = os.path.join(os.path.dirname(__file__), '..', 'http_root', 'corpus', 'words')
OUTPUT_FILE = os.path.join(WORDS_DIR, 'language_charsets.json')
SKIP_FILES  = {'language_charsets.json'}


def codepoints_for_text(text: str) -> list[int]:
    """Return sorted unique codepoints present in text, excluding control chars and space."""
    points: set[int] = set()
    for char in text:
        cp = ord(char)
        if cp > 0x0020:          # skip NUL, control chars, and ASCII space
            points.add(cp)
    return sorted(points)


def main() -> None:
    result: dict[str, list[int]] = {}

    try:
        filenames = sorted(os.listdir(WORDS_DIR))
    except FileNotFoundError:
        print(f'ERROR: directory not found: {WORDS_DIR}', file=sys.stderr)
        sys.exit(1)

    for filename in filenames:
        if not filename.endswith('.txt') or filename in SKIP_FILES:
            continue

        language  = os.path.splitext(filename)[0]
        full_path = os.path.join(WORDS_DIR, filename)

        with open(full_path, encoding='utf-8') as fh:
            text = fh.read()

        codepoints              = codepoints_for_text(text)
        result[language]        = codepoints
        print(f'  {language:<20} {len(codepoints):>4} unique codepoints')

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)

    print(f'\nWrote {len(result)} language entries → {OUTPUT_FILE}')


if __name__ == '__main__':
    main()
