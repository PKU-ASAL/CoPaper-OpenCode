"""Discussion dimensions and Socratic question bank."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import cast


class QuestionType(str, Enum):
    """Supported Socratic question categories."""

    CLARIFICATION = "clarification"
    ASSUMPTION = "assumption"
    EVIDENCE = "evidence"
    ALTERNATIVE = "alternative"
    IMPLICATION = "implication"


@dataclass
class Question:
    """One predefined Socratic question."""

    qtype: QuestionType
    text: str
    follow_up: str = ""


@dataclass
class Dimension:
    """A checker-aligned discussion dimension."""

    id: str
    name: str
    description: str
    source: str
    checker_name: str | None
    parent: str | None = None
    questions: list[Question] = field(default_factory=list)


def _questions(
    clarification: str,
    assumption: str,
    evidence: str,
    alternative: str,
    implication: str,
) -> list[Question]:
    return [
        Question(QuestionType.CLARIFICATION, clarification),
        Question(QuestionType.ASSUMPTION, assumption),
        Question(QuestionType.EVIDENCE, evidence),
        Question(QuestionType.ALTERNATIVE, alternative),
        Question(QuestionType.IMPLICATION, implication),
    ]


def _dimension(
    dim_id: str,
    name: str,
    description: str,
    checker_name: str,
    clarification: str,
    assumption: str,
    evidence: str,
    alternative: str,
    implication: str,
) -> Dimension:
    return Dimension(
        id=dim_id,
        name=name,
        description=description,
        source="checker",
        checker_name=checker_name,
        parent=None,
        questions=_questions(
            clarification,
            assumption,
            evidence,
            alternative,
            implication,
        ),
    )


class DimensionRegistry:
    """Registry of hardcoded checker dimensions."""

    def __init__(self) -> None:
        self._dimensions: dict[str, Dimension] = {}
        self._checker_map: dict[str, list[str]] = {}
        self._load_all()

    def _load_all(self) -> None:
        """Load all predefined dimensions."""
        for dimension in (
            _build_problem_dimensions()
            + _build_novelty_dimensions()
            + _build_technical_depth_dimensions()
            + _build_logic_dimensions()
            + _build_clarity_dimensions()
            + _build_evaluation_protocol_dimensions()
            + _build_data_dimensions()
        ):
            self._register_dimension(dimension)

    def _register_dimension(self, dimension: Dimension) -> None:
        self._dimensions[dimension.id] = dimension
        if dimension.checker_name is not None:
            self._checker_map.setdefault(dimension.checker_name, []).append(
                dimension.id
            )

    def get_dimensions(self, source: str | None = None) -> list[Dimension]:
        dimensions = list(self._dimensions.values())
        if source is None:
            return dimensions
        return [dimension for dimension in dimensions if dimension.source == source]

    def get_dimension(self, dim_id: str) -> Dimension | None:
        return self._dimensions.get(dim_id)

    def get_dimensions_for_checker(self, checker_name: str) -> list[Dimension]:
        dim_ids = self._checker_map.get(checker_name, [])
        return [self._dimensions[dim_id] for dim_id in dim_ids]

    def get_questions_for_dimension(self, dim_id: str) -> list[Question]:
        dimension = self.get_dimension(dim_id)
        if dimension is None:
            return []
        return list(dimension.questions)

    def get_uncovered_dimensions(
        self, discussion_log: dict[str, object]
    ) -> list[Dimension]:
        raw_covered = discussion_log.get("covered_dimensions", [])
        covered: set[str] = set()
        if isinstance(raw_covered, list):
            for item in cast(list[object], raw_covered):
                if isinstance(item, str):
                    covered.add(item)
        return [
            dimension
            for dimension in self.get_dimensions()
            if dimension.id not in covered
        ]


def _build_problem_dimensions() -> list[Dimension]:
    checker = "problem-checker"
    return [
        _dimension(
            "problem_unclear_statement",
            "Unclear Problem Statement",
            "The paper does not express the core problem crisply enough.",
            checker,
            "Can you state the core problem in one sentence without field-specific jargon?",
            "What assumptions are you making about the problem boundary and who experiences it?",
            "What evidence shows this problem appears in real research or practice settings?",
            "Could the paper frame the issue as a different but sharper problem statement, and why is your framing better?",
            "If readers still cannot restate the problem after the introduction, what downstream confusion will that create?",
        ),
        _dimension(
            "problem_missing_formalization",
            "Missing Problem Formalization",
            "The problem lacks a precise definition, variables, constraints, or objectives.",
            checker,
            "Which parts of the problem should be formalized as inputs, outputs, objectives, or constraints?",
            "What assumptions let you treat the problem as formally well-posed rather than informal intuition?",
            "What theoretical definition, notation, or task specification supports your formalization?",
            "Could a lighter qualitative framing work instead, or is formalization necessary to distinguish your contribution?",
            "If the task remains informal, how will readers evaluate correctness, scope, or reproducibility?",
        ),
        _dimension(
            "problem_insufficient_importance_justification",
            "Insufficient Importance Justification",
            "The paper does not convincingly explain why the problem matters.",
            checker,
            "What makes this problem important enough to deserve attention now?",
            "What assumptions are you making about the size, urgency, or consequences of the problem?",
            "What concrete empirical, industrial, or societal evidence demonstrates the problem's importance?",
            "Are there adjacent problems that might matter more, and why is this one the right focus for your paper?",
            "If the importance case is weak, how would that affect the paper's significance claim?",
        ),
        _dimension(
            "problem_missing_practical_relevance_evidence",
            "Missing Practical Relevance Evidence",
            "The paper claims real-world relevance without showing practical grounding.",
            checker,
            "Where exactly does this problem surface in practical workflows, systems, or decision contexts?",
            "Are you assuming laboratory conditions transfer directly to practice, and what if they do not?",
            "What user studies, deployment reports, incidents, or field observations support the practical relevance claim?",
            "Could the work be framed as primarily theoretical instead, and why insist on practical relevance?",
            "If practitioners do not actually face this issue, what part of your motivation needs to change?",
        ),
        _dimension(
            "problem_weak_motivation",
            "Weak Problem Motivation",
            "The narrative does not create enough urgency or curiosity around the problem.",
            checker,
            "What motivating scenario best illustrates why a reader should care about this problem?",
            "What assumptions are you making about what will persuade readers that the problem is worth solving?",
            "What examples, failures, or gaps in current practice provide motivating evidence?",
            "Would a different motivating narrative or use case better reveal the paper's central tension?",
            "If the motivation stays flat, how likely is it that reviewers will dismiss the paper before reaching the method?",
        ),
        _dimension(
            "problem_missing_evidence_types",
            "Missing Evidence Types",
            "The argument omits important forms of support such as empirical, theoretical, or experiential evidence.",
            checker,
            "Which kinds of evidence are currently missing from your problem justification?",
            "Are you assuming one evidence type, such as anecdotes or theory alone, is sufficient for this audience?",
            "What additional empirical, theoretical, or practitioner evidence could triangulate the problem claim?",
            "Could another evidence mix make the argument more balanced and credible?",
            "If one evidence type later fails scrutiny, how resilient is your overall problem argument?",
        ),
        _dimension(
            "problem_solution_mismatch",
            "Problem-Solution Mismatch",
            "The proposed solution does not clearly address the problem as stated.",
            checker,
            "Which exact part of the stated problem does your solution target, and which parts does it not?",
            "Are you assuming solving a proxy issue will automatically solve the original problem?",
            "What evidence shows that improvements in your chosen intervention actually relieve the stated problem?",
            "Could the solution be reframed to a narrower problem, or should the problem statement be changed instead?",
            "If the mismatch remains, what claims about impact or contribution become overstated?",
        ),
        _dimension(
            "problem_incomplete_context",
            "Incomplete Problem Context",
            "The paper does not provide enough background to situate the problem properly.",
            checker,
            "What contextual factors must a new reader know before the problem statement fully makes sense?",
            "What assumptions are you making about reader familiarity with the domain, workflow, or prior constraints?",
            "What background literature, system details, or domain facts support this contextual framing?",
            "Could a different context reveal a different core problem or limitation?",
            "If the context stays incomplete, how might readers misinterpret the scope or stakes of the problem?",
        ),
    ]


def _build_novelty_dimensions() -> list[Dimension]:
    checker = "novelty-checker"
    return [
        _dimension(
            "novelty_duplicate_insight",
            "Duplicate or Near-Duplicate Insight",
            "The main insight may already exist in prior work or differ only superficially.",
            checker,
            "What specifically is novel about your insight compared with the closest prior work?",
            "Are you assuming readers will overlook highly similar ideas published in neighboring areas?",
            "What comparison table or citation-backed analysis shows your insight is not a near-duplicate?",
            "Could the paper instead claim a new setting, synthesis, or evaluation rather than a new insight?",
            "If the insight is judged duplicative, which parts of your contribution claim still survive?",
        ),
        _dimension(
            "novelty_insufficient_differentiation",
            "Insufficient Differentiation",
            "Differences from prior work are present but not articulated clearly enough.",
            checker,
            "Which dimensions of difference matter most when comparing your work with prior art?",
            "Are you assuming small implementation differences automatically count as conceptual differentiation?",
            "What side-by-side evidence demonstrates meaningful differences in idea, mechanism, or scope?",
            "Could you differentiate on problem framing, assumptions, or evaluation rather than only method details?",
            "If differentiation remains vague, how will reviewers distinguish contribution from incremental variation?",
        ),
        _dimension(
            "novelty_missing_prior_art_citation",
            "Missing Prior Art Citation",
            "Relevant prior work is not cited where novelty claims are made.",
            checker,
            "Which prior papers are most directly relevant to the novelty claim you are making?",
            "Are you assuming uncited work is too obscure, too old, or outside your venue to matter?",
            "What literature search results or citation chains support that your current related work coverage is complete?",
            "Could citing more prior art actually sharpen your novelty claim by defining a cleaner boundary?",
            "If key prior art surfaces during review, how would it weaken trust in the paper's scholarship?",
        ),
        _dimension(
            "novelty_overstated_claims",
            "Overstated Novelty Claims",
            "The novelty language is stronger than the evidence can support.",
            checker,
            "Which novelty phrases in the paper sound strongest, and do they match what was actually achieved?",
            "Are you assuming terms like first, unprecedented, or fundamentally new are justified without exhaustive proof?",
            "What evidence shows the wording of your novelty claims is calibrated rather than inflated?",
            "Would a more modest claim about improvement, integration, or adaptation be more defensible?",
            "If reviewers see overclaiming, how might that affect credibility beyond the novelty section?",
        ),
        _dimension(
            "novelty_weak_differentiation_arguments",
            "Weak Differentiation Arguments",
            "The paper offers differences, but the reasoning for why they matter is weak.",
            checker,
            "Why do the differences you highlight matter scientifically or practically rather than cosmetically?",
            "Are you assuming any deviation from prior work is automatically meaningful?",
            "What evidence shows your differentiating choices lead to new capabilities, results, or understanding?",
            "Could another argument about mechanism, scope, or theory better justify why the difference matters?",
            "If the differences are real but unimportant, what should the paper claim instead?",
        ),
        _dimension(
            "novelty_missing_dimension_analysis",
            "Missing Novelty Dimension Analysis",
            "The paper does not analyze novelty across idea, method, setting, data, and evaluation dimensions.",
            checker,
            "Along which novelty dimensions, such as idea, method, data, or setting, do you claim contribution?",
            "Are you assuming novelty in one dimension excuses similarity in all others?",
            "What evidence maps each claimed novelty dimension to concrete differences from prior work?",
            "Could the paper reposition the contribution onto a different novelty dimension with stronger support?",
            "If you cannot specify the novelty dimension, how will readers know what is genuinely new?",
        ),
        _dimension(
            "novelty_cross_domain_similarity_not_addressed",
            "Cross-Domain Similarity Not Addressed",
            "Potentially similar work in another field is not discussed.",
            checker,
            "What analogous ideas exist in adjacent domains that resemble your contribution?",
            "Are you assuming methods from another community do not count as relevant prior art?",
            "What evidence from cross-domain searches shows you examined neighboring literature seriously?",
            "Could acknowledging cross-domain similarity strengthen the paper by clarifying transfer or adaptation?",
            "If reviewers identify an overlooked analog in another field, how would that alter your novelty framing?",
        ),
        _dimension(
            "novelty_related_work_mismatch",
            "Novelty vs. Related Work Mismatch",
            "The novelty claim and related work discussion are not aligned with each other.",
            checker,
            "Do your novelty claims match the categories and comparisons presented in related work?",
            "Are you assuming readers will reconcile inconsistencies between the introduction and related work section?",
            "What textual or table-based evidence shows the same comparison baseline is used across sections?",
            "Could you revise either the novelty claim or related work taxonomy so they support each other better?",
            "If the mismatch persists, what confusion will it create about the paper's actual contribution boundary?",
        ),
    ]


def _build_technical_depth_dimensions() -> list[Dimension]:
    checker = "technical-depth-checker"
    return [
        _dimension(
            "depth_shallow_trivial_design",
            "Shallow or Trivial Design",
            "The design appears too simple to support a strong technical contribution.",
            checker,
            "Which part of the design contains the non-trivial technical substance?",
            "Are you assuming combining known pieces is enough to count as deep design work?",
            "What evidence shows the design required more than straightforward implementation effort?",
            "Could the paper instead emphasize engineering value if the design is intentionally simple?",
            "If the design looks trivial, how will that affect claims of technical contribution?",
        ),
        _dimension(
            "depth_missing_technical_challenges",
            "Missing Technical Challenges",
            "The paper does not explain the hard technical obstacles that motivated the design.",
            checker,
            "What concrete technical challenges made this problem hard before your solution?",
            "Are you assuming readers will infer the difficulty without you naming the obstacles explicitly?",
            "What failed attempts, complexity barriers, or domain constraints support the challenge narrative?",
            "Could the design be reorganized around challenge-solution pairs to expose the technical depth more clearly?",
            "If the challenges remain unstated, why would readers believe the method required new design thinking?",
        ),
        _dimension(
            "depth_obvious_standard_solutions",
            "Obvious or Standard Solutions",
            "The solution may be a direct application of standard techniques without enough innovation.",
            checker,
            "Which parts of the solution go beyond standard recipes in this area?",
            "Are you assuming standard techniques become novel simply because they are applied to your case?",
            "What evidence shows a naive standard baseline would not have achieved the same result?",
            "Could you position the work as careful adaptation or systemization rather than a new technical design?",
            "If the solution is obvious in hindsight, how should the contribution claim be narrowed?",
        ),
        _dimension(
            "depth_insufficient_technical_detail",
            "Insufficient Technical Detail",
            "The method description is too thin to support understanding or reproduction.",
            checker,
            "Which design steps, algorithms, or interfaces still need more concrete technical detail?",
            "Are you assuming high-level prose is enough for experts to reconstruct the method correctly?",
            "What pseudocode, equations, architecture diagrams, or ablations support the missing details?",
            "Could some detail move to an appendix, or is it central enough that the main paper must include it?",
            "If critical details remain absent, how will readers evaluate soundness or reproduce the design?",
        ),
        _dimension(
            "depth_missing_design_rationale",
            "Missing Design Rationale",
            "The paper says what was built but not why those choices were made.",
            checker,
            "Why were these specific design choices made instead of other plausible ones?",
            "What assumptions about the domain, workload, or failure modes drove those choices?",
            "What experiments, theory, or engineering constraints support your design rationale?",
            "Could a different rationale suggest a different architecture that would be more convincing?",
            "If the rationale stays implicit, how will readers judge whether the design is principled or ad hoc?",
        ),
        _dimension(
            "depth_missing_complexity_analysis",
            "Missing Complexity Analysis",
            "The paper does not analyze time, space, or other resource complexity.",
            checker,
            "Which computational, memory, or operational complexity properties matter most for this design?",
            "Are you assuming practical usefulness can be argued without quantifying resource costs?",
            "What derivations, scaling plots, or benchmark measurements support the complexity claims?",
            "Could another cost model, such as latency, annotation effort, or deployment overhead, better capture complexity here?",
            "If complexity remains unexamined, what risks arise for adoption or fair comparison?",
        ),
        _dimension(
            "depth_superficial_challenge_solution_mapping",
            "Superficial Challenge-Solution Mapping",
            "Challenges and design elements are listed, but their correspondence is shallow.",
            checker,
            "Which design component addresses which technical challenge, one by one?",
            "Are you assuming readers will infer the mapping between challenges and mechanisms on their own?",
            "What evidence, such as ablations or case analysis, verifies each component resolves its intended challenge?",
            "Could a cleaner decomposition make the challenge-solution links more explicit and testable?",
            "If the mapping stays vague, how will readers know whether each component is necessary?",
        ),
        _dimension(
            "depth_missing_alternative_design_discussion",
            "Missing Alternative Design Discussion",
            "The paper does not explain what alternatives were considered and rejected.",
            checker,
            "What alternative designs did you seriously consider before choosing the final approach?",
            "Are you assuming the chosen architecture is self-evidently best and needs no comparison?",
            "What experiments, trade-off analysis, or implementation experience support rejecting the alternatives?",
            "Could presenting a small design space analysis strengthen the reader's trust in your final choice?",
            "If no alternatives are discussed, how will readers tell whether the design was optimized or accidental?",
        ),
        _dimension(
            "depth_insufficient_novelty_in_design",
            "Insufficient Novelty in Design",
            "The design is technically detailed but may not introduce enough new thinking.",
            checker,
            "Which design element is actually new rather than simply more detailed than prior work?",
            "Are you assuming implementation depth can substitute for conceptual novelty?",
            "What evidence separates new design ideas from careful but standard engineering?",
            "Could the paper shift emphasis to empirical thoroughness if design novelty is limited?",
            "If the design is only detailed but not novel, how should the contribution be reframed?",
        ),
        _dimension(
            "depth_missing_domain_specific_depth",
            "Missing Domain-Specific Depth",
            "The design does not engage deeply enough with the target domain's unique constraints.",
            checker,
            "What domain-specific constraints make this design problem different from a generic software solution?",
            "Are you assuming a domain-agnostic method will satisfy readers who expect specialized insight?",
            "What evidence shows your design reflects real domain structure, constraints, or expert requirements?",
            "Could incorporating more domain knowledge or failure cases reveal deeper technical substance?",
            "If domain-specific depth is absent, why would experts in that area see the work as more than generic reuse?",
        ),
    ]


def _build_logic_dimensions() -> list[Dimension]:
    checker = "logic-checker"
    return [
        _dimension(
            "logic_claim_evidence_mismatch",
            "Claim-Evidence Mismatch",
            "A claim is stronger or broader than the evidence provided.",
            checker,
            "Which exact claim is being made, and what scope does it cover?",
            "Are you assuming evidence from one setting justifies a broader claim than it actually supports?",
            "What direct evidence maps to each major claim in the paper?",
            "Could the claim be narrowed, or should stronger evidence be added instead?",
            "If the mismatch remains, which conclusions become unreliable or overstated?",
        ),
        _dimension(
            "logic_internal_contradictions",
            "Internal Contradictions",
            "Different parts of the paper appear to conflict with each other.",
            checker,
            "Which statements in the paper appear to conflict when read side by side?",
            "What assumptions changed between sections, causing the contradiction?",
            "What textual or experimental evidence can reconcile the conflicting statements?",
            "Could one section's wording be revised to reflect a narrower or more precise claim?",
            "If contradictions remain, how will reviewers judge the paper's coherence and reliability?",
        ),
        _dimension(
            "logic_logical_fallacies",
            "Logical Fallacies",
            "The reasoning uses invalid inference patterns or rhetorical shortcuts.",
            checker,
            "What is the actual argument chain from premises to conclusion in this section?",
            "Are you assuming correlation, anecdote, or authority is enough to prove the conclusion?",
            "What evidence or reasoning step is needed to make the inference logically valid?",
            "Is there a different argument structure that avoids this fallacy while preserving the main point?",
            "If the fallacious reasoning is removed, does the conclusion still stand?",
        ),
        _dimension(
            "logic_missing_logical_support",
            "Missing Logical Support",
            "An important inference step is missing between premises and conclusion.",
            checker,
            "Which reasoning step is currently implicit but necessary for the conclusion to follow?",
            "Are you assuming readers will supply the missing inference because it feels intuitive?",
            "What theorem, prior result, experimental result, or argument can fill the missing support?",
            "Could the paper reorganize the argument so the premises and conclusion are connected more transparently?",
            "If the missing support is never added, what part of the paper's argument becomes a leap of faith?",
        ),
        _dimension(
            "logic_abstract_body_consistency",
            "Abstract-Body Consistency",
            "The abstract does not accurately match what the body delivers.",
            checker,
            "Which claims in the abstract need to be traceable to specific sections of the paper body?",
            "Are you assuming a persuasive abstract can safely overreach beyond the paper's actual contents?",
            "What evidence in the body supports each major abstract statement?",
            "Should the abstract be softened, or should missing body support be added?",
            "If abstract and body diverge, how will that affect reviewer trust from the first page onward?",
        ),
    ]


def _build_clarity_dimensions() -> list[Dimension]:
    checker = "clarity-checker"
    return [
        _dimension(
            "clarity_undefined_terms",
            "Undefined Terms",
            "Important terms appear before they are defined clearly.",
            checker,
            "Which key term appears before a reader has enough information to understand it?",
            "Are you assuming the target audience already knows this term in the same sense you intend?",
            "What definition, citation, or example supports the intended meaning of the term?",
            "Could a simpler term or an earlier definition reduce ambiguity?",
            "If the term stays undefined, how many later arguments become unstable or confusing?",
        ),
        _dimension(
            "clarity_vaguely_defined_terms",
            "Vaguely Defined Terms",
            "A term is defined, but the definition remains fuzzy or underspecified.",
            checker,
            "What exactly does this term include and exclude in your paper?",
            "Are you assuming a broad intuitive definition is good enough for technical discussion?",
            "What examples, boundaries, or citations could make the definition precise?",
            "Could the term be replaced with a narrower phrase that better matches your intent?",
            "If the definition stays vague, what misreadings could affect evaluation of the contribution?",
        ),
        _dimension(
            "clarity_inconsistent_term_usage",
            "Inconsistent Term Usage",
            "The same concept is described with shifting terminology across the paper.",
            checker,
            "Which terms are currently being used interchangeably for the same concept?",
            "Are you assuming readers will realize those labels refer to the same idea every time?",
            "What textual evidence or terminology audit shows consistent usage across sections?",
            "Could you standardize on one primary term and demote the rest to aliases or historical references?",
            "If inconsistent naming remains, how might readers mistake one concept for several different ones?",
        ),
        _dimension(
            "clarity_acronym_abbreviation_issues",
            "Acronym and Abbreviation Issues",
            "Acronyms are missing definitions, overloaded, or used too aggressively.",
            checker,
            "Which acronyms or abbreviations would confuse a reader encountering them for the first time?",
            "Are you assuming the venue's audience shares the same shorthand and will not misread it?",
            "What glossary-style definitions or first-use expansions support the current abbreviations?",
            "Would spelling out some terms more often improve readability without sacrificing concision?",
            "If acronym overload continues, how much cognitive load does it add to the paper?",
        ),
        _dimension(
            "clarity_ambiguous_references",
            "Ambiguous References",
            "Pronouns or references do not clearly identify what they point to.",
            checker,
            "What does each ambiguous this, it, they, or former actually refer to in context?",
            "Are you assuming sentence proximity alone makes the referent obvious?",
            "What sentence-level evidence suggests readers are likely to resolve the reference correctly?",
            "Could repeating the noun phrase be clearer than using a pronoun in this case?",
            "If references remain ambiguous, which arguments or method steps could be misunderstood?",
        ),
        _dimension(
            "clarity_vague_quantifiers_qualifiers",
            "Vague Quantifiers and Qualifiers",
            "Words like many, often, significant, or robust are used without calibration.",
            checker,
            "Which quantifier or qualifier in the text is too vague to be informative?",
            "Are you assuming readers will interpret subjective words the same way you do?",
            "What numbers, thresholds, or cited benchmarks can replace or anchor the vague wording?",
            "Could a more explicit statistical or qualitative statement communicate the point better?",
            "If vague qualifiers remain, how might they weaken the precision of your claims?",
        ),
        _dimension(
            "clarity_missing_context_background",
            "Missing Context or Background",
            "The paper jumps into claims without enough setup for non-specialist readers.",
            checker,
            "What background knowledge does a competent but non-specialist reader need before this section?",
            "Are you assuming readers already know the domain history, task setup, or key debates?",
            "What citations, examples, or short background paragraphs would supply the missing context?",
            "Could moving some context earlier prevent later confusion more effectively than adding footnotes?",
            "If the background gap remains, where will readers most likely lose the thread of the paper?",
        ),
        _dimension(
            "clarity_sentence_level_issues",
            "Sentence-Level Clarity Issues",
            "Individual sentences are hard to parse because of structure, density, or wording.",
            checker,
            "Which sentence is hardest to parse on a first reading, and why?",
            "Are you assuming dense syntax signals sophistication rather than obscurity?",
            "What evidence from peer feedback or self-review suggests the sentence structure needs simplification?",
            "Could splitting the sentence, reordering clauses, or reducing nominalization improve clarity?",
            "If sentence-level opacity persists, how much of the paper's actual merit will be hidden from readers?",
        ),
    ]


def _build_evaluation_protocol_dimensions() -> list[Dimension]:
    checker = "evaluation-protocol-checker"
    return [
        _dimension(
            "eval_missing_incomplete_research_questions",
            "Missing or Incomplete Research Questions",
            "The evaluation lacks clear research questions or leaves them underspecified.",
            checker,
            "What research questions should the evaluation answer explicitly?",
            "Are you assuming the experiments can speak for themselves without named research questions?",
            "What protocol elements show each research question is operationalized into measurable tests?",
            "Could a smaller set of sharper research questions make the evaluation more coherent?",
            "If the questions remain implicit, how will readers judge whether the evaluation succeeded?",
        ),
        _dimension(
            "eval_rq_insight_misalignment",
            "RQ-Insight Misalignment",
            "The research questions do not test the paper's core insight directly.",
            checker,
            "How does each research question connect back to the paper's central insight?",
            "Are you assuming general performance gains are enough to validate the insight itself?",
            "What evidence shows the chosen experiments isolate and test the insight rather than only the system outcome?",
            "Could one research question be rewritten to probe the mechanism behind the insight more directly?",
            "If insight and questions remain misaligned, what part of the paper's narrative breaks?",
        ),
        _dimension(
            "eval_rq_design_misalignment",
            "RQ-Design Misalignment",
            "The research questions do not match the actual system or method design choices.",
            checker,
            "Which design decisions are important enough that a research question should evaluate them explicitly?",
            "Are you assuming a broad end-to-end experiment is sufficient to justify each design choice?",
            "What ablations, analyses, or measurements support alignment between the questions and the design?",
            "Could the evaluation be reorganized around design decisions rather than datasets or metrics alone?",
            "If the misalignment persists, how will readers know whether the proposed design is actually validated?",
        ),
        _dimension(
            "eval_internal_validity_threats_not_addressed",
            "Internal Validity Threats Not Addressed",
            "Confounds and alternative causes inside the experiment are not discussed adequately.",
            checker,
            "What internal confounds could explain the observed results besides your proposed mechanism?",
            "Are you assuming the experiment setup isolates causality when hidden variables may still exist?",
            "What controls, ablations, or sensitivity analyses address internal validity threats?",
            "Could a redesigned experiment reduce confounding more effectively than a post hoc discussion?",
            "If internal validity is weak, how much of the causal interpretation should be withdrawn?",
        ),
        _dimension(
            "eval_external_validity_threats_not_addressed",
            "External Validity Threats Not Addressed",
            "The limits of generalization across settings, users, or datasets are not analyzed.",
            checker,
            "To which populations, datasets, or environments do you expect the results to generalize?",
            "Are you assuming success in one benchmark transfers to real-world or cross-domain settings?",
            "What evidence from varied datasets, deployment contexts, or literature supports external validity?",
            "Could the paper make narrower but more credible generalization claims?",
            "If external validity is overstated, which practical conclusions become unsafe?",
        ),
        _dimension(
            "eval_construct_validity_threats_not_addressed",
            "Construct Validity Threats Not Addressed",
            "The measurements may not faithfully represent the intended concepts.",
            checker,
            "What conceptual construct is each metric or instrument supposed to measure?",
            "Are you assuming the chosen proxy truly captures the underlying concept of interest?",
            "What validation studies, citations, or triangulation support the construct validity of your measures?",
            "Could another operationalization better represent the construct you care about?",
            "If construct validity is weak, how should readers reinterpret the reported outcomes?",
        ),
        _dimension(
            "eval_conclusion_validity_threats_not_addressed",
            "Conclusion Validity Threats Not Addressed",
            "The statistical or inferential basis for the conclusions is not robust enough.",
            checker,
            "What exact conclusions are you drawing from the observed differences or patterns?",
            "Are you assuming limited samples, noisy results, or multiple comparisons do not threaten inference?",
            "What significance tests, effect sizes, confidence intervals, or robustness checks support the conclusions?",
            "Could more conservative inference or additional runs change the conclusions materially?",
            "If conclusion validity is weak, which headline results should be stated more cautiously?",
        ),
        _dimension(
            "eval_missing_baseline_comparisons",
            "Missing Baseline Comparisons",
            "The evaluation omits important baselines needed for fair interpretation.",
            checker,
            "Which baselines are necessary for readers to judge whether your method is actually competitive or insightful?",
            "Are you assuming a small set of easy baselines is enough for a fair comparison?",
            "What literature or benchmark norms support the baseline set you selected?",
            "Could adding stronger or more diagnostic baselines change the story the evaluation tells?",
            "If key baselines are missing, how much confidence can readers place in comparative claims?",
        ),
        _dimension(
            "eval_inadequate_metric_selection",
            "Inadequate Metric Selection",
            "The chosen metrics do not capture the right success criteria or trade-offs.",
            checker,
            "Why do these metrics reflect success for the problem and contribution you claim?",
            "Are you assuming popular benchmark metrics align with your paper's actual goals?",
            "What empirical or theoretical justification supports this metric set over alternatives?",
            "Could a different metric or multi-metric view better expose trade-offs and failure cases?",
            "If metric selection is poor, how might readers misjudge the method's strengths and weaknesses?",
        ),
        _dimension(
            "eval_incomplete_experimental_protocol",
            "Incomplete Experimental Protocol",
            "Important procedural details are missing from the evaluation design.",
            checker,
            "Which protocol details must be specified for another researcher to reproduce the evaluation?",
            "Are you assuming defaults for splits, seeds, tuning, or preprocessing are obvious to readers?",
            "What experiment logs, appendix details, or scripts document the protocol completely?",
            "Could the protocol be expressed as a checklist or table to make omissions visible?",
            "If the protocol remains incomplete, how will that affect reproducibility and reviewer trust?",
        ),
    ]


def _build_data_dimensions() -> list[Dimension]:
    checker = "data-checker"
    return [
        _dimension(
            "data_bogus_placeholder_data_detected",
            "Bogus/Placeholder Data Detected",
            "Reported numbers or tables appear to be placeholders rather than real results.",
            checker,
            "Which values look like placeholders, estimates, or copied template data rather than measured results?",
            "Are you assuming provisional numbers are acceptable because they will be replaced later?",
            "What raw outputs, logs, or experiment artifacts prove these reported values are real?",
            "Could you omit unfinished tables temporarily instead of presenting placeholder values?",
            "If placeholder data remains in the paper, what does that imply for the integrity of the evaluation?",
        ),
        _dimension(
            "data_missing_reproduction_script_link",
            "Missing Reproduction Script Link",
            "A claimed reproduction script exists conceptually but is not linked from the paper or artifact.",
            checker,
            "Where should a reader expect to find the reproduction script link for this table or figure?",
            "Are you assuming reviewers will discover the script location without an explicit link?",
            "What artifact metadata, appendix note, or repository path documents the script link?",
            "Could the paper adopt a consistent script-link convention for every reproducible result?",
            "If the link stays missing, how much friction does that add to verification of your results?",
        ),
        _dimension(
            "data_missing_reproduction_script",
            "Missing Reproduction Script",
            "No actual script is available to regenerate the reported result.",
            checker,
            "Which specific result currently lacks a script that can reproduce it from source data?",
            "Are you assuming prose instructions are enough in place of an executable reproduction script?",
            "What repository contents or artifact checklist confirm that a runnable script now exists?",
            "Could you reduce the reproducibility claim if full scripting support is not yet feasible?",
            "If the script remains absent, what part of the paper's reproducibility story fails?",
        ),
        _dimension(
            "data_script_execution_failure",
            "Script Execution Failure",
            "The reproduction script exists but does not run successfully.",
            checker,
            "At what exact step does the reproduction script fail when run in a clean environment?",
            "Are you assuming environment quirks or missing dependencies do not count as a reproducibility problem?",
            "What execution logs, environment files, or reruns show the script can complete successfully?",
            "Could a simpler wrapper, pinned environment, or automated check make execution more reliable?",
            "If the script keeps failing, how should readers interpret the credibility of the reported results?",
        ),
        _dimension(
            "data_script_output_mismatch",
            "Script Output Mismatch",
            "The script output does not match the numbers or figures presented in the paper.",
            checker,
            "Which reported outputs differ from what the reproduction script actually generates?",
            "Are you assuming small mismatches are harmless even when they affect claims or rankings?",
            "What logs, checksums, or versioned outputs show the paper and script are synchronized?",
            "Could result generation and paper tables be unified through one pipeline to eliminate drift?",
            "If the mismatch persists, which conclusions or tables need to be corrected immediately?",
        ),
        _dimension(
            "data_incomplete_reproduction_information",
            "Incomplete Reproduction Information",
            "Some supporting details are missing even if scripts and data exist.",
            checker,
            "What information, such as seed, environment, path, or command, is still missing for reproduction?",
            "Are you assuming experienced readers can infer the omitted configuration details?",
            "What README entries, metadata files, or run logs supply the missing reproduction information?",
            "Could a single reproduction checklist capture everything needed more clearly?",
            "If reproduction details stay incomplete, how much effort will others waste guessing your setup?",
        ),
        _dimension(
            "data_inconsistency",
            "Data Inconsistency",
            "Different files, tables, or claims report inconsistent data.",
            checker,
            "Which datasets, counts, or reported values disagree across your paper, scripts, or artifacts?",
            "Are you assuming minor inconsistencies will not matter if the overall trend looks similar?",
            "What source-of-truth files or validation checks confirm the consistent version of the data?",
            "Could automated validation catch these inconsistencies before results are reported?",
            "If data inconsistency remains, what effect will it have on confidence in the full artifact?",
        ),
        _dimension(
            "data_missing_data_files",
            "Missing Data Files",
            "Required data files are not present or not accessible for reproduction.",
            checker,
            "Which exact data files are required to reproduce the results and are currently missing?",
            "Are you assuming readers can regenerate or request the missing files later without issue?",
            "What artifact manifest or repository listing proves the required data files are available?",
            "Could you provide a smaller public subset or downloader if direct distribution is constrained?",
            "If essential data files are unavailable, what reproducibility claims must be withdrawn?",
        ),
    ]


DIMENSION_REGISTRY = DimensionRegistry()


def get_uncovered_dimensions(state: dict[str, object]) -> list[Dimension]:
    """Return dimensions not yet covered in discussion rounds."""
    discussion_log = {"covered_dimensions": state.get("covered_dimensions", [])}
    return DIMENSION_REGISTRY.get_uncovered_dimensions(discussion_log)


__all__ = [
    "DIMENSION_REGISTRY",
    "Dimension",
    "DimensionRegistry",
    "Question",
    "QuestionType",
    "get_uncovered_dimensions",
]
