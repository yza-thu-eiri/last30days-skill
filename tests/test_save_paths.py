"""Tests for save-path generation helpers."""

import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from scripts.last30days import build_save_path


class TestBuildSavePath(unittest.TestCase):
    def test_builds_flat_save_path_by_default(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = build_save_path(Path(tmpdir), "Test Topic", now=datetime(2026, 3, 31))
            self.assertEqual(path, Path(tmpdir) / "test-topic-raw.md")

    def test_builds_nested_save_path_for_category(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = build_save_path(Path(tmpdir), "Test Topic", "AI Tools", now=datetime(2026, 3, 31))
            self.assertEqual(path, Path(tmpdir) / "ai-tools" / "test-topic-raw.md")

    def test_appends_date_when_file_exists(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            existing = base / "ai-tools" / "test-topic-raw.md"
            existing.parent.mkdir(parents=True, exist_ok=True)
            existing.write_text("existing", encoding="utf-8")

            path = build_save_path(base, "Test Topic", "AI Tools", now=datetime(2026, 3, 31))
            self.assertEqual(path, base / "ai-tools" / "test-topic-raw-2026-03-31.md")


if __name__ == "__main__":
    unittest.main()
