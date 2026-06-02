"""Tests for copaper.dimensions module."""

from __future__ import annotations

from copaper.dimensions import DimensionRegistry, QuestionType


class TestDimensionRegistry:
    def test_total_dimension_count(self) -> None:
        registry = DimensionRegistry()
        assert len(registry.get_dimensions()) >= 57

    def test_each_dimension_has_questions(self) -> None:
        registry = DimensionRegistry()

        for dimension in registry.get_dimensions():
            assert 3 <= len(dimension.questions) <= 5

    def test_question_sequence_order(self) -> None:
        registry = DimensionRegistry()
        expected_order = [
            QuestionType.CLARIFICATION,
            QuestionType.ASSUMPTION,
            QuestionType.EVIDENCE,
            QuestionType.ALTERNATIVE,
            QuestionType.IMPLICATION,
        ]

        for dimension in registry.get_dimensions():
            actual_order = [question.qtype for question in dimension.questions]
            assert actual_order == expected_order

    def test_dimensions_for_checker_mapping(self) -> None:
        registry = DimensionRegistry()
        expected_counts = {
            "problem-checker": 8,
            "novelty-checker": 8,
            "technical-depth-checker": 10,
            "logic-checker": 5,
            "clarity-checker": 8,
            "evaluation-protocol-checker": 10,
            "data-checker": 8,
        }

        for checker_name, count in expected_counts.items():
            assert len(registry.get_dimensions_for_checker(checker_name)) == count

    def test_uncovered_dimensions_detection(self) -> None:
        registry = DimensionRegistry()
        covered = [
            "problem_unclear_statement",
            "novelty_duplicate_insight",
            "depth_shallow_trivial_design",
        ]

        uncovered = registry.get_uncovered_dimensions({"covered_dimensions": covered})
        uncovered_ids = {dimension.id for dimension in uncovered}

        assert len(uncovered) == len(registry.get_dimensions()) - len(covered)
        assert uncovered_ids.isdisjoint(set(covered))
        assert "logic_claim_evidence_mismatch" in uncovered_ids

    def test_get_dimension_by_id(self) -> None:
        registry = DimensionRegistry()

        dimension = registry.get_dimension("problem_unclear_statement")

        assert dimension is not None
        assert dimension.name == "Unclear Problem Statement"
        assert dimension.checker_name == "problem-checker"

    def test_get_questions_for_dimension(self) -> None:
        registry = DimensionRegistry()

        questions = registry.get_questions_for_dimension("data_script_output_mismatch")

        assert len(questions) == 5
        assert questions[0].qtype is QuestionType.CLARIFICATION
        assert "differ" in questions[0].text.lower()
