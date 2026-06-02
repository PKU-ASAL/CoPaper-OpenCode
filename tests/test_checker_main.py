"""Tests for copaper.checker_integration and copaper.__main__."""

from __future__ import annotations

from copaper.checker_integration import run_checkers, format_checker_results


class TestCheckerIntegration:
    def test_run_checkers_callable(self) -> None:
        result = run_checkers()
        assert result is None

    def test_run_checkers_with_checkers_list(self) -> None:
        result = run_checkers(checkers=["novelty"])
        assert result is None

    def test_format_checker_results_callable(self) -> None:
        result = format_checker_results({})
        assert isinstance(result, str)


class TestMainEntryPoint:
    def test_main_module_importable(self) -> None:
        import copaper.__main__  # noqa: F401
