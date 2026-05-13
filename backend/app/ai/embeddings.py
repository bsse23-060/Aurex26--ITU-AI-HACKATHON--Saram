"""Lazy-loaded sentence-transformers wrapper.

We pay the model-load cost only on first use and reuse it process-wide.
This keeps `uvicorn --reload` snappy when nothing touches embeddings yet,
while letting Chroma index population at startup share the same instance.
"""

from __future__ import annotations

import logging
import threading
from typing import Iterable, List, Optional

import numpy as np

from ..config import settings

_log = logging.getLogger(__name__)
_model = None
_lock = threading.Lock()
_dim: Optional[int] = None


def _get_model():
    global _model, _dim
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        from sentence_transformers import SentenceTransformer  # local import: slow

        _log.info("Loading embedding model %s", settings.embed_model)
        _model = SentenceTransformer(settings.embed_model)
        _dim = _model.get_sentence_embedding_dimension()
        _log.info("Embedding model loaded; dim=%d", _dim)
    return _model


def embedding_dim() -> int:
    if _dim is not None:
        return _dim
    _get_model()
    return _dim or 384


def embed_texts(texts: Iterable[str]) -> List[List[float]]:
    items = [t if t else " " for t in texts]
    if not items:
        return []
    model = _get_model()
    arr = model.encode(items, normalize_embeddings=True, show_progress_bar=False)
    return arr.tolist()


def embed_text(text: str) -> List[float]:
    return embed_texts([text])[0]


def cosine(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    av = np.asarray(a, dtype=np.float32)
    bv = np.asarray(b, dtype=np.float32)
    denom = (np.linalg.norm(av) * np.linalg.norm(bv)) or 1.0
    return float(np.dot(av, bv) / denom)
