"""Bayesian Knowledge Tracing (BKT).

Standard four-parameter formulation:
- P(L0): prior probability of mastery before observing any evidence
- P(T):  probability of transitioning from un-mastered to mastered after a learning opportunity
- P(G):  probability of guessing correctly while un-mastered
- P(S):  probability of slipping (incorrect) while mastered

We use one global parameter set; per-concept parameters could be learned
from data but are overkill for hackathon scope.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BKTParams:
    p_l0: float = 0.30
    p_transit: float = 0.15
    p_guess: float = 0.20
    p_slip: float = 0.10


DEFAULT_PARAMS = BKTParams()


def initial_mastery(params: BKTParams = DEFAULT_PARAMS) -> float:
    return params.p_l0


def update_mastery(
    prior: float,
    correct: bool,
    params: BKTParams = DEFAULT_PARAMS,
) -> float:
    """Update P(mastery) after observing a single response.

    Returns the posterior probability of mastery clamped to (0, 1).
    """

    prior = _clamp(prior)

    if correct:
        numerator = prior * (1.0 - params.p_slip)
        denominator = numerator + (1.0 - prior) * params.p_guess
    else:
        numerator = prior * params.p_slip
        denominator = numerator + (1.0 - prior) * (1.0 - params.p_guess)

    if denominator <= 0:
        posterior_given_evidence = prior
    else:
        posterior_given_evidence = numerator / denominator

    posterior = posterior_given_evidence + (1.0 - posterior_given_evidence) * params.p_transit
    return _clamp(posterior)


def difficulty_for_mastery(p_mastery: float) -> float:
    """Choose a target item difficulty for the current mastery level.

    Slightly above the learner's current ability keeps them in the productive
    struggle zone (cf. zone of proximal development). Returns a value in [0,1].
    """

    return _clamp(p_mastery + 0.10)


def is_mastered(p_mastery: float, threshold: float = 0.85) -> bool:
    return p_mastery >= threshold


def _clamp(value: float, lo: float = 1e-4, hi: float = 1.0 - 1e-4) -> float:
    return max(lo, min(hi, value))
