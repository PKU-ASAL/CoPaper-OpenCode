"""Tests for copaper.eventlog module (Task 5)."""

from __future__ import annotations

import json
import threading
from pathlib import Path
from unittest.mock import patch

import pytest

from copaper.eventlog import EventLogger


class TestLogCreatesValidJsonl:
    def test_log_creates_valid_jsonl(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        logger.log(
            action="search_papers",
            operator="ai",
            result="success",
            phase="literature",
            session_id="sess-001",
            papers_found=5,
        )

        raw = log_path.read_text(encoding="utf-8")
        lines = [l for l in raw.strip().split("\n") if l]
        assert len(lines) == 1

        event = json.loads(lines[0])
        assert event["operator"] == "ai"
        assert event["phase"] == "literature"
        assert event["action"] == "search_papers"
        assert event["result"] == "success"
        assert event["session_id"] == "sess-001"
        assert event["metadata"]["papers_found"] == 5
        assert "timestamp" in event

    def test_log_creates_parent_directory(self, tmp_project_dir: Path) -> None:
        nested = tmp_project_dir / "deep" / "nested" / "events.jsonl"
        logger = EventLogger(str(nested))

        logger.log(action="init", operator="system", result="success")

        assert nested.exists()
        event = json.loads(nested.read_text(encoding="utf-8").strip())
        assert event["action"] == "init"

    def test_log_rejects_invalid_operator(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        with pytest.raises(ValueError, match="Invalid operator"):
            logger.log(action="test", operator="hacker", result="failure")


class TestQueryByPhase:
    def test_query_by_phase(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        logger.log(action="search", operator="ai", result="success", phase="literature")
        logger.log(
            action="write_section", operator="ai", result="success", phase="writing"
        )
        logger.log(
            action="review", operator="user", result="success", phase="latex_review"
        )

        results = logger.query(phase="writing")
        assert len(results) == 1
        assert results[0]["phase"] == "writing"
        assert results[0]["action"] == "write_section"


class TestQueryByOperator:
    def test_query_by_operator(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        logger.log(action="search", operator="ai", result="success", phase="literature")
        logger.log(action="approve", operator="user", result="success", phase="writing")
        logger.log(action="auto_save", operator="system", result="success")

        ai_events = logger.query(operator="ai")
        assert len(ai_events) == 1
        assert ai_events[0]["operator"] == "ai"

        user_events = logger.query(operator="user")
        assert len(user_events) == 1
        assert user_events[0]["operator"] == "user"


class TestQueryLastN:
    def test_query_last_n(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        for i in range(5):
            logger.log(
                action=f"step_{i}", operator="ai", result="success", phase="writing"
            )

        results = logger.query(last_n=2)
        assert len(results) == 2
        assert results[0]["action"] == "step_3"
        assert results[1]["action"] == "step_4"

    def test_query_combined_filters(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        logger.log(action="a1", operator="ai", result="success", phase="literature")
        logger.log(action="a2", operator="user", result="success", phase="literature")
        logger.log(action="a3", operator="ai", result="success", phase="writing")

        results = logger.query(phase="literature", operator="ai")
        assert len(results) == 1
        assert results[0]["action"] == "a1"


class TestLogRotation:
    def test_log_rotation_at_10mb(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        # Use a small rotation threshold so the test runs fast
        with patch("copaper.eventlog._MAX_LOG_SIZE", 500):
            # Write enough events to exceed 500 bytes
            for i in range(50):
                logger.log(action=f"bulk_{i}", operator="system", result="success")

            assert log_path.stat().st_size >= 500

            logger.log(action="trigger_rotation", operator="system", result="success")

            backup_path = log_path.with_suffix(".jsonl.1")
            assert backup_path.exists(), "Backup file should exist after rotation"

            fresh_events = logger._read_all()
            assert len(fresh_events) == 1
            assert fresh_events[0]["action"] == "trigger_rotation"


class TestConcurrentWrites:
    def test_concurrent_writes(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        num_threads = 10
        writes_per_thread = 50
        barrier = threading.Barrier(num_threads)

        def writer(thread_id: int) -> None:
            barrier.wait()
            for i in range(writes_per_thread):
                logger.log(
                    action=f"t{thread_id}_w{i}",
                    operator="ai",
                    result="success",
                    phase="writing",
                )

        threads = [
            threading.Thread(target=writer, args=(tid,)) for tid in range(num_threads)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        total_expected = num_threads * writes_per_thread
        events = logger._read_all()
        assert len(events) == total_expected

        raw = log_path.read_text(encoding="utf-8")
        for line in raw.strip().split("\n"):
            if line:
                json.loads(line)


class TestExport:
    def test_export_jsonl(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        logger.log(action="test", operator="ai", result="success")
        exported = logger.export()
        assert "test" in exported
        assert exported.count("\n") == 1

    def test_export_empty_file(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))
        assert logger.export() == ""

    def test_export_unsupported_format(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        with pytest.raises(ValueError, match="Unsupported export format"):
            logger.export(format="csv")


class TestQuerySince:
    def test_query_since(self, tmp_project_dir: Path) -> None:
        log_path = tmp_project_dir / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))

        logger.log(action="old", operator="ai", result="success", phase="literature")
        logger.log(action="new", operator="ai", result="success", phase="writing")

        events = logger.query(since="2000-01-01T00:00:00")
        assert len(events) == 2

        events = logger.query(since="2099-01-01T00:00:00")
        assert len(events) == 0
