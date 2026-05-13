"""Detect Roman Urdu / Urdu / English code-switching in tutor input.

We avoid heavyweight `langid`/`langdetect` dependencies. Roman Urdu is the
hardest case because it's Latin script, so we use a curated marker list.
Urdu is trivially detected via the Arabic Unicode block.
"""

from __future__ import annotations

import re

# Hand-picked tokens that almost always indicate Roman Urdu, not English.
ROMAN_URDU_MARKERS = {
    "kya", "kyu", "kyun", "kyon", "kese", "kaise", "kaisa", "kahan", "kab", "kon", "kaun",
    "hai", "hain", "ho", "hota", "hoti", "hoga", "hogi", "tha", "thi", "thay",
    "main", "mein", "mera", "meri", "mere", "tum", "tumhara", "tumhari", "ap", "aap",
    "apka", "apki", "humein", "hume", "hum", "humara", "humari",
    "nahi", "nai", "haan", "han", "bhi", "bhi", "magar", "lekin", "phir", "fir",
    "yaar", "bhai", "behen", "samjho", "samjha", "samajh", "batao", "bataya",
    "kuch", "kuchh", "sab", "sabh", "thora", "thori", "zyada", "zaada",
    "achha", "acha", "theek", "thik", "matlab", "wala", "wali", "wale",
    "sahi", "ghalat", "nahin", "kar", "karo", "karna", "karte", "karta", "karti",
    "diya", "dia", "lo", "lijiye", "leke", "ke", "ka", "ki", "ko", "se", "par",
    "dhang", "tareeqa", "tarika", "samajhne", "samjhna", "padhna", "parhna",
}

URDU_SCRIPT_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F]")
WORD_RE = re.compile(r"[A-Za-z']+")


def detect_language(text: str) -> str:
    """Returns one of: 'ur' (Urdu script), 'roman_ur', 'en'."""

    if not text or not text.strip():
        return "en"

    urdu_chars = len(URDU_SCRIPT_RE.findall(text))
    if urdu_chars >= 3:
        return "ur"

    words = [w.lower() for w in WORD_RE.findall(text)]
    if not words:
        return "ur" if urdu_chars > 0 else "en"

    marker_hits = sum(1 for w in words if w in ROMAN_URDU_MARKERS)
    ratio = marker_hits / max(1, len(words))

    if marker_hits >= 2 or ratio >= 0.2:
        return "roman_ur"

    return "en"


LANGUAGE_INSTRUCTIONS = {
    "en": (
        "Reply in clear, friendly English. Use short paragraphs and concrete examples."
    ),
    "roman_ur": (
        "Reply in natural Roman Urdu (Urdu written with Latin letters) mixed with English "
        "where technical terms are clearer in English. Match the learner's code-switching "
        "style. Be warm and conversational - like a senior bhai/behen helping out."
    ),
    "ur": (
        "Reply primarily in Urdu (Nastaliq script). Keep technical terms in English when "
        "they're the standard usage. Be respectful and warm."
    ),
}


def system_language_instruction(language: str) -> str:
    return LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["en"])
