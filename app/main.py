import base64
import os
import re
import ssl
import subprocess
import tempfile
from html import escape
from io import BytesIO
from pathlib import Path
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

import certifi
from fastapi import FastAPI, File, Response, UploadFile
from markitdown import MarkItDown
from pydantic import BaseModel

app = FastAPI(title="Python REST API")
markitdown = MarkItDown()
MEDIA_DOWNLOAD_MAX_BYTES = int(os.getenv("MEDIA_DOWNLOAD_MAX_BYTES", str(50 * 1024 * 1024)))
MEDIA_DOWNLOAD_TIMEOUT_SECONDS = float(os.getenv("MEDIA_DOWNLOAD_TIMEOUT_SECONDS", "60"))


class HtmlToMarkdownRequest(BaseModel):
    html: str


@app.post("/html-to-markdown", response_class=Response)
def html_to_markdown(request: HtmlToMarkdownRequest) -> Response:
    markdown = convert_html_to_markdown(request.html)
    return Response(content=markdown, media_type="text/markdown")


@app.post("/html-file-to-markdown", response_class=Response)
async def html_file_to_markdown(file: UploadFile = File(...)) -> Response:
    html_content = await file.read()
    markdown = convert_html_bytes_to_markdown(html_content)
    markdown_filename = get_markdown_filename(file.filename)
    return markdown_response(markdown, markdown_filename)


@app.post("/file-to-markdown", response_class=Response)
async def file_to_markdown(file: UploadFile = File(...)) -> Response:
    file_content = await file.read()
    markdown = convert_file_bytes_to_markdown(file_content, file.filename)
    markdown_filename = get_markdown_filename(file.filename)
    return markdown_response(markdown, markdown_filename)


def convert_html_to_markdown(html: str) -> str:
    return convert_html_bytes_to_markdown(html.encode("utf-8"))


def convert_html_bytes_to_markdown(html_content: bytes) -> str:
    html_with_transcripts = insert_embedded_media_transcripts(html_content)
    return convert_bytes_to_markdown(html_with_transcripts.encode("utf-8"), ".html")


def convert_file_bytes_to_markdown(file_content: bytes, filename: str | None) -> str:
    file_extension = get_file_extension(filename)
    if is_audio_video_extension(file_extension):
        return transcribe_media_to_markdown(file_content, file_extension)
    return convert_bytes_to_markdown(file_content, file_extension)


def convert_bytes_to_markdown(file_content: bytes, file_extension: str | None) -> str:
    file_stream = BytesIO(file_content)
    result = markitdown.convert_stream(file_stream, file_extension=file_extension)
    return result.text_content


def insert_embedded_media_transcripts(html_content: bytes) -> str:
    html = html_content.decode("utf-8", errors="ignore")

    def replace_media(match: re.Match[str]) -> str:
        media_html = match.group(0)
        media_content, file_extension = get_media_content(media_html)
        if media_content is None:
            return media_html
        transcript = transcribe_media(media_content, file_extension)
        return media_html + format_transcript_html(transcript)

    return re.sub(
        r"<(?P<element>audio|video)\b[^>]*>.*?</(?P=element)>",
        replace_media,
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )


def get_media_content(media_html: str) -> tuple[bytes | None, str | None]:
    data_uri_match = get_media_data_uri_match(media_html)
    if data_uri_match is not None:
        media_type = data_uri_match.group("type").lower()
        media_content = base64.b64decode(data_uri_match.group("data"), validate=True)
        return media_content, get_media_extension(media_type)

    url_match = get_media_url_match(media_html)
    if url_match is not None:
        return download_media_url(url_match.group("url"))

    return None, None


def get_media_data_uri_match(media_html: str) -> re.Match[str] | None:
    return re.search(
        r"\bsrc=[\"']data:(?P<type>audio|video)/[^;]+;base64,(?P<data>[^\"']+)[\"']",
        media_html,
        flags=re.IGNORECASE,
    )


def get_media_url_match(media_html: str) -> re.Match[str] | None:
    return re.search(
        r"\bsrc=[\"'](?P<url>https?://[^\"']+)[\"']",
        media_html,
        flags=re.IGNORECASE,
    )


def download_media_url(url: str) -> tuple[bytes, str | None]:
    request = Request(url, headers={"User-Agent": "kuli-be/1.0"})
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    with urlopen(request, timeout=MEDIA_DOWNLOAD_TIMEOUT_SECONDS, context=ssl_context) as response:
        content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
        if not (content_type.startswith("audio/") or content_type.startswith("video/")):
            raise RuntimeError(f"Unsupported media URL content type: {content_type}")

        content_length = response.headers.get("content-length")
        if content_length and int(content_length) > MEDIA_DOWNLOAD_MAX_BYTES:
            raise RuntimeError("Media URL is larger than the configured download limit.")

        chunks = []
        total_size = 0
        while True:
            chunk = response.read(64 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MEDIA_DOWNLOAD_MAX_BYTES:
                raise RuntimeError("Media URL is larger than the configured download limit.")
            chunks.append(chunk)

    return b"".join(chunks), get_media_url_extension(url, content_type)


def get_media_url_extension(url: str, content_type: str) -> str | None:
    file_extension = get_file_extension(urlparse(url).path)
    if file_extension:
        return file_extension
    return {
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "video/mp4": ".mp4",
    }.get(content_type)


def format_transcript_html(transcript: str) -> str:
    escaped_transcript = "<br>".join(escape(line) for line in transcript.splitlines())
    return (
        '<section class="media-transcript">'
        "<h3>Audio/Video Transcript</h3>"
        f"<p>{escaped_transcript}</p>"
        "</section>"
    )


def transcribe_media_to_markdown(media_content: bytes, file_extension: str | None) -> str:
    transcript = transcribe_media(media_content, file_extension)
    return f"### Audio/Video Transcript\n\n{transcript}"


def transcribe_media(media_content: bytes, file_extension: str | None) -> str:
    wav_path = convert_media_to_wav(media_content, file_extension)
    try:
        from moonshine_voice.moonshine_api import ModelArch
        from moonshine_voice.transcriber import Transcriber
        from moonshine_voice.utils import get_model_path, load_wav_file

        model_name = os.getenv("MOONSHINE_MODEL_NAME", "tiny-en")
        model_arch_name = os.getenv("MOONSHINE_MODEL_ARCH", "tiny").upper().replace("-", "_")
        model_arch = getattr(ModelArch, model_arch_name)
        audio_data, sample_rate = load_wav_file(wav_path)
        with Transcriber(get_model_path(model_name), model_arch=model_arch) as transcriber:
            transcript = transcriber.transcribe_without_streaming(audio_data, sample_rate)
        return "\n".join(line.text for line in transcript.lines if line.text).strip()
    finally:
        Path(wav_path).unlink(missing_ok=True)


def convert_media_to_wav(media_content: bytes, file_extension: str | None) -> str:
    with tempfile.NamedTemporaryFile(suffix=file_extension or ".media", delete=False) as input_file:
        input_file.write(media_content)
        input_path = input_file.name
    output_path = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    Path(output_path).unlink(missing_ok=True)
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                input_path,
                "-ac",
                "1",
                "-ar",
                "16000",
                "-f",
                "wav",
                output_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return output_path
    except FileNotFoundError as exc:
        raise RuntimeError("Audio/video transcription requires ffmpeg.") from exc
    finally:
        Path(input_path).unlink(missing_ok=True)


def is_audio_video_extension(file_extension: str | None) -> bool:
    return file_extension in {".wav", ".mp3", ".m4a", ".mp4"}


def get_media_extension(media_type: str) -> str:
    return ".wav" if media_type == "audio" else ".mp4"


def get_file_extension(filename: str | None) -> str | None:
    if not filename or "." not in filename:
        return None
    return "." + filename.rsplit(".", 1)[1].lower()


def get_markdown_filename(filename: str | None) -> str:
    if not filename:
        return "converted.md"
    name = filename.rsplit(".", 1)[0]
    return f"{name}.md"


def markdown_response(markdown: str, filename: str) -> Response:
    return Response(
        content=markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": get_content_disposition(filename)},
    )


def get_content_disposition(filename: str) -> str:
    try:
        filename.encode("latin-1")
    except UnicodeEncodeError:
        return f"attachment; filename*=UTF-8''{quote(filename)}"
    return f'attachment; filename="{filename}"'


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Hello, World!"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
