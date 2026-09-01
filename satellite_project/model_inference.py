"""Optional Parallax AI model adapter.

Drop the team's trained LEVIR-CD256 model into this project and implement
predict_change(before_rgb, after_rgb). The backend will automatically use it.

Return a HxW boolean/0-1 numpy mask where 1 means changed.

This file intentionally contains no fake model: if no real model is wired in,
Parallax safely falls back to the disaster-specific spectral detectors in
backend.py.
"""

import numpy as np


def predict_change(before_rgb: np.ndarray, after_rgb: np.ndarray) -> np.ndarray:
    raise NotImplementedError(
        "Connect the trained LEVIR-CD256 model here and return a HxW change mask."
    )
