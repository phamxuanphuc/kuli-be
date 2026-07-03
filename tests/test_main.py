from fastapi.testclient import TestClient

from app.main import MEDIA_DOWNLOAD_MAX_BYTES, app, get_scan_history_connection, get_scan_history_db_path

client = TestClient(app)


def test_read_root() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello, World!"}


def test_health_check() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_html_to_markdown(monkeypatch) -> None:
    def fake_convert_html_to_markdown(html: str) -> str:
        assert html == "<h1>Hello</h1>"
        return "# Hello"

    monkeypatch.setattr("app.main.convert_html_to_markdown", fake_convert_html_to_markdown)

    response = client.post("/html-to-markdown", json={"html": "<h1>Hello</h1>"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert response.text == "# Hello"


def test_html_file_to_markdown_with_unicode_filename(monkeypatch) -> None:
    def fake_convert_html_bytes_to_markdown_fast(html_content: bytes) -> str:
        assert html_content == b"<h1>Hello</h1>"
        return "# Hello"

    monkeypatch.setattr(
        "app.main.convert_html_bytes_to_markdown_fast",
        fake_convert_html_bytes_to_markdown_fast,
    )

    response = client.post(
        "/html-file-to-markdown",
        files={"file": ("nội_dung.html", b"<h1>Hello</h1>", "text/html")},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert response.headers["content-disposition"] == "attachment; filename*=UTF-8''n%E1%BB%99i_dung.md"
    assert response.text == "# Hello"


def test_file_to_markdown_with_audio_transcript(monkeypatch) -> None:
    def fake_convert_file_bytes_to_markdown(file_content: bytes, filename: str | None) -> str:
        assert file_content == b"audio bytes"
        assert filename == "meeting.mp3"
        return "### Audio Transcript:\nhello from audio"

    monkeypatch.setattr(
        "app.main.convert_file_bytes_to_markdown",
        fake_convert_file_bytes_to_markdown,
    )

    response = client.post(
        "/file-to-markdown",
        files={"file": ("meeting.mp3", b"audio bytes", "audio/mpeg")},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert response.headers["content-disposition"] == 'attachment; filename="meeting.md"'
    assert response.text == "### Audio Transcript:\nhello from audio"


def test_convert_audio_uses_moonshine_transcription(monkeypatch) -> None:
    def fake_transcribe_media(media_content: bytes, file_extension: str | None) -> str:
        assert media_content == b"audio bytes"
        assert file_extension == ".mp3"
        return "hello from moonshine"

    monkeypatch.setattr("app.main.transcribe_media", fake_transcribe_media)

    from app.main import convert_file_bytes_to_markdown

    assert convert_file_bytes_to_markdown(b"audio bytes", "meeting.mp3") == (
        "### Audio/Video Transcript\n\nhello from moonshine"
    )


def test_html_with_embedded_audio_transcript(monkeypatch) -> None:
    def fake_convert_bytes_to_markdown(file_content: bytes, file_extension: str | None) -> str:
        assert file_extension == ".html"
        assert file_content == (
            b'<html><audio src="data:audio/wav;base64,YXVkaW8gYnl0ZXM="></audio>'
            b'<section class="media-transcript"><h3>Audio/Video Transcript</h3>'
            b"<p>embedded hello</p></section></html>"
        )
        return "# Page\n\n### Audio/Video Transcript\n\nembedded hello"

    def fake_transcribe_media(media_content: bytes, file_extension: str | None) -> str:
        assert media_content == b"audio bytes"
        assert file_extension == ".wav"
        return "embedded hello"

    monkeypatch.setattr("app.main.convert_bytes_to_markdown", fake_convert_bytes_to_markdown)
    monkeypatch.setattr("app.main.transcribe_media", fake_transcribe_media)

    from app.main import convert_html_bytes_to_markdown

    html = b'<html><audio src="data:audio/wav;base64,YXVkaW8gYnl0ZXM="></audio></html>'

    assert convert_html_bytes_to_markdown(html) == (
        "# Page\n\n### Audio/Video Transcript\n\nembedded hello"
    )


def test_html_with_audio_url_transcript(monkeypatch) -> None:
    def fake_convert_bytes_to_markdown(file_content: bytes, file_extension: str | None) -> str:
        assert file_extension == ".html"
        assert file_content == (
            b'<html><audio src="https://example.com/audio.mp3"></audio>'
            b'<section class="media-transcript"><h3>Audio/Video Transcript</h3>'
            b"<p>url audio hello</p></section></html>"
        )
        return "# Page\n\n### Audio/Video Transcript\n\nurl audio hello"

    def fake_transcribe_media_url(url: str) -> str:
        assert url == "https://example.com/audio.mp3"
        return "url audio hello"

    monkeypatch.setattr("app.main.convert_bytes_to_markdown", fake_convert_bytes_to_markdown)
    monkeypatch.setattr("app.main.transcribe_media_url", fake_transcribe_media_url)

    from app.main import convert_html_bytes_to_markdown

    html = b'<html><audio src="https://example.com/audio.mp3"></audio></html>'

    assert convert_html_bytes_to_markdown(html) == (
        "# Page\n\n### Audio/Video Transcript\n\nurl audio hello"
    )


def test_default_media_download_limit_supports_110mb_audio_url() -> None:
    assert MEDIA_DOWNLOAD_MAX_BYTES == 150 * 1024 * 1024



def test_html_with_duplicate_audio_url_transcribes_once(monkeypatch) -> None:
    def fake_convert_bytes_to_markdown(file_content: bytes, file_extension: str | None) -> str:
        assert file_extension == ".html"
        assert file_content == (
            b'<html><audio src="https://example.com/audio.mp3"></audio>'
            b'<section class="media-transcript"><h3>Audio/Video Transcript</h3>'
            b"<p>cached hello</p></section>"
            b'<audio src="https://example.com/audio.mp3"></audio>'
            b'<section class="media-transcript"><h3>Audio/Video Transcript</h3>'
            b"<p>cached hello</p></section></html>"
        )
        return "# Page"

    calls = []

    def fake_transcribe_media_url(url: str) -> str:
        calls.append(url)
        return "cached hello"

    monkeypatch.setattr("app.main.convert_bytes_to_markdown", fake_convert_bytes_to_markdown)
    monkeypatch.setattr("app.main.transcribe_media_url", fake_transcribe_media_url)

    from app.main import convert_html_bytes_to_markdown

    html = (
        b'<html><audio src="https://example.com/audio.mp3"></audio>'
        b'<audio src="https://example.com/audio.mp3"></audio></html>'
    )

    assert convert_html_bytes_to_markdown(html) == "# Page"
    assert calls == ["https://example.com/audio.mp3"]



def test_html_with_too_large_audio_url_keeps_media_without_transcript(monkeypatch) -> None:
    def fake_convert_bytes_to_markdown(file_content: bytes, file_extension: str | None) -> str:
        assert file_extension == ".html"
        assert file_content == b'<html><audio src="https://example.com/large.mp3"></audio></html>'
        return "# Page"

    def fake_transcribe_media_url(url: str) -> str:
        assert url == "https://example.com/large.mp3"
        raise RuntimeError("Media URL is larger than the configured download limit.")

    monkeypatch.setattr("app.main.convert_bytes_to_markdown", fake_convert_bytes_to_markdown)
    monkeypatch.setattr("app.main.transcribe_media_url", fake_transcribe_media_url)

    from app.main import convert_html_bytes_to_markdown

    html = b'<html><audio src="https://example.com/large.mp3"></audio></html>'

    assert convert_html_bytes_to_markdown(html) == "# Page"



def test_download_media_url_uses_certifi_ssl_context(monkeypatch) -> None:
    class FakeResponse:
        headers = {"content-type": "audio/mpeg", "content-length": "11"}

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return None

        def read(self, size: int) -> bytes:
            if not hasattr(self, "already_read"):
                self.already_read = True
                return b"audio bytes"
            return b""

    def fake_urlopen(request, timeout: float, context):
        assert request.full_url == "https://example.com/audio.mp3"
        assert timeout == 120
        assert context is not None
        return FakeResponse()

    monkeypatch.setattr("app.main.urlopen", fake_urlopen)

    from app.main import download_media_url

    assert download_media_url("https://example.com/audio.mp3") == (b"audio bytes", ".mp3")


def test_html_file_to_markdown(monkeypatch) -> None:
    def fake_convert_html_bytes_to_markdown_fast(html_content: bytes) -> str:
        assert html_content == b"<h1>Hello</h1>"
        return "# Hello"

    monkeypatch.setattr(
        "app.main.convert_html_bytes_to_markdown_fast",
        fake_convert_html_bytes_to_markdown_fast,
    )

    response = client.post(
        "/html-file-to-markdown",
        files={"file": ("hello.html", b"<h1>Hello</h1>", "text/html")},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert response.headers["content-disposition"] == 'attachment; filename="hello.md"'
    assert response.text == "# Hello"


def test_html_file_to_markdown_updates_existing_scan_history(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "scan_history.sqlite3"
    monkeypatch.setattr("app.main.SCAN_HISTORY_DB_PATH", str(db_path))

    def fake_convert_html_bytes_to_markdown_fast(html_content: bytes) -> str:
        assert html_content == b"<h1>Hello</h1>"
        return "# Hello"

    monkeypatch.setattr(
        "app.main.convert_html_bytes_to_markdown_fast",
        fake_convert_html_bytes_to_markdown_fast,
    )
    monkeypatch.setattr("app.main.update_scan_history_transcripts", lambda history_id, html_content: None)

    create_response = client.post(
        "/scan-history",
        json={
            "title": "Pending",
            "url": "https://example.com/pending",
            "html": "",
            "markdown": "",
            "media": [],
        },
    )
    history_id = create_response.json()["id"]

    convert_response = client.post(
        "/html-file-to-markdown",
        data={
            "history_id": str(history_id),
            "url": "https://example.com/final",
            "media_json": '[{"kind":"image","src":"https://example.com/image.png"}]',
        },
        files={"file": ("hello.html", b"<h1>Hello</h1>", "text/html")},
    )

    assert convert_response.status_code == 200
    assert convert_response.text == "# Hello"

    history_response = client.get(f"/scan-history/{history_id}")

    assert history_response.status_code == 200
    history = history_response.json()
    assert history["title"] == "hello"
    assert history["url"] == "https://example.com/final"
    assert history["html"] == "<h1>Hello</h1>"
    assert history["markdown"] == "# Hello"
    assert history["media"] == [{"kind": "image", "src": "https://example.com/image.png"}]


def test_default_scan_history_db_path_uses_user_app_support(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr("app.main.SCAN_HISTORY_DB_PATH", None)
    monkeypatch.setattr("app.main.Path.home", lambda: tmp_path)

    assert get_scan_history_db_path() == tmp_path / "Library" / "Application Support" / "Kuli" / "scan_history.sqlite3"


def test_scan_history_connection_creates_parent_directory(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "nested" / "scan_history.sqlite3"
    monkeypatch.setattr("app.main.SCAN_HISTORY_DB_PATH", str(db_path))

    with get_scan_history_connection(init=False) as connection:
        connection.execute("SELECT 1")

    assert db_path.parent.exists()
    assert db_path.exists()


def test_scan_history_crud(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "scan_history.sqlite3"
    monkeypatch.setattr("app.main.SCAN_HISTORY_DB_PATH", str(db_path))

    create_response = client.post(
        "/scan-history",
        json={
            "title": "Example",
            "url": "https://example.com",
            "html": "<h1>Example</h1>",
            "markdown": "# Example",
            "media": [{"kind": "image", "src": "https://example.com/image.png"}],
        },
    )

    assert create_response.status_code == 200
    created = create_response.json()
    assert created["id"] == 1
    assert created["title"] == "Example"
    assert created["url"] == "https://example.com"
    assert created["html"] == "<h1>Example</h1>"
    assert created["markdown"] == "# Example"
    assert created["media"] == [{"kind": "image", "src": "https://example.com/image.png"}]
    assert created["created_at"]
    assert created["updated_at"]

    list_response = client.get("/scan-history")

    assert list_response.status_code == 200
    assert list_response.json() == [created]

    get_response = client.get("/scan-history/1")

    assert get_response.status_code == 200
    assert get_response.json() == created

    update_response = client.put(
        "/scan-history/1",
        json={"title": "Updated", "markdown": "# Updated", "media": []},
    )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["id"] == 1
    assert updated["title"] == "Updated"
    assert updated["url"] == "https://example.com"
    assert updated["markdown"] == "# Updated"
    assert updated["media"] == []

    delete_response = client.delete("/scan-history/1")

    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}
    assert client.get("/scan-history/1").status_code == 404
