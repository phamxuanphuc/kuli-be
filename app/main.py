import base64
import logging
import os
import time
import re
import shutil
import ssl
import subprocess
import tempfile
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from html import escape
from io import BytesIO
from pathlib import Path
from urllib.parse import quote, urlparse
from urllib.request import Request as UrllibRequest, urlopen

import certifi
from fastapi import FastAPI, File, Request, Response, UploadFile
from markitdown import MarkItDown
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

app = FastAPI(title="Python REST API")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %s (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response
markitdown = MarkItDown()
MEDIA_DOWNLOAD_MAX_BYTES = int(os.getenv("MEDIA_DOWNLOAD_MAX_BYTES", str(150 * 1024 * 1024)))
MEDIA_DOWNLOAD_TIMEOUT_SECONDS = float(os.getenv("MEDIA_DOWNLOAD_TIMEOUT_SECONDS", "120"))
TRANSCRIBE_MAX_WORKERS = int(os.getenv("TRANSCRIBE_MAX_WORKERS", "4"))
TRANSCRIBE_EXECUTOR = os.getenv("TRANSCRIBE_EXECUTOR", "process").lower()
FFMPEG_TIMEOUT_SECONDS = float(os.getenv("FFMPEG_TIMEOUT_SECONDS", "60"))


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
    url_transcripts: dict[str, str] = prefetch_media_url_transcripts(html)

    def replace_media(match: re.Match[str]) -> str:
        media_html = match.group(0)
        try:
            transcript = get_media_transcript(media_html, url_transcripts)
            if not transcript:
                logger.warning("transcribe: no transcript produced for media")
                return media_html
        except RuntimeError as exc:
            logger.warning("transcribe: skipped media (%s)", exc)
            return media_html
        except Exception:
            logger.exception("transcribe: unexpected error, skipping media")
            return media_html
        return media_html + format_transcript_html(transcript)

    return re.sub(
        r"<(?P<element>audio|video)\b[^>]*>.*?</(?P=element)>",
        replace_media,
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )


def get_media_transcript(media_html: str, url_transcripts: dict[str, str]) -> str | None:
    data_uri_match = get_media_data_uri_match(media_html)
    if data_uri_match is not None:
        media_type = data_uri_match.group("type").lower()
        media_content = base64.b64decode(data_uri_match.group("data"), validate=True)
        return transcribe_media(media_content, get_media_extension(media_type))

    url_match = get_media_url_match(media_html)
    if url_match is None:
        return None

    url = url_match.group("url")
    if url not in url_transcripts:
        url_transcripts[url] = transcribe_media_url(url)
    return url_transcripts[url]





def prefetch_media_url_transcripts(html: str) -> dict[str, str]:
    media_urls = []
    seen_urls = set()
    for match in re.finditer(
        r"<(?P<element>audio|video)\b[^>]*>.*?</(?P=element)>",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        url_match = get_media_url_match(match.group(0))
        if url_match is None:
            continue
        url = url_match.group("url")
        if url in seen_urls:
            continue
        seen_urls.add(url)
        media_urls.append(url)

    if not media_urls:
        return {}

    max_workers = max(1, min(TRANSCRIBE_MAX_WORKERS, len(media_urls)))
    logger.info(
        "transcribe: prefetch %s media URLs with %s %s workers",
        len(media_urls),
        max_workers,
        TRANSCRIBE_EXECUTOR,
    )

    use_processes = TRANSCRIBE_EXECUTOR == "process" and transcribe_media_url.__module__ == __name__
    executor_class = ProcessPoolExecutor if use_processes else ThreadPoolExecutor
    url_transcripts = {}
    with executor_class(max_workers=max_workers) as executor:
        for url, transcript in executor.map(transcribe_media_url_for_prefetch, media_urls):
            url_transcripts[url] = transcript
    return url_transcripts


def transcribe_media_url_for_prefetch(url: str) -> tuple[str, str]:
    try:
        return url, transcribe_media_url(url)
    except RuntimeError as exc:
        logger.warning("transcribe: skipped media URL %s (%s)", url, exc)
    except Exception:
        logger.exception("transcribe: unexpected error for media URL %s", url)
    return url, ""


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
    request = UrllibRequest(url, headers={"User-Agent": "kuli-be/1.0"})
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    with urlopen(request, timeout=MEDIA_DOWNLOAD_TIMEOUT_SECONDS, context=ssl_context) as response:
        content_type = validate_media_url_response(response.headers.get("content-type", ""))
        validate_media_content_length(response.headers.get("content-length"))

        chunks = []
        total_size = 0
        while True:
            chunk = response.read(64 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            validate_media_download_size(total_size)
            chunks.append(chunk)

    return b"".join(chunks), get_media_url_extension(url, content_type)



def download_media_url_to_file(url: str) -> tuple[str, str | None]:
    request = UrllibRequest(url, headers={"User-Agent": "kuli-be/1.0"})
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    with urlopen(request, timeout=MEDIA_DOWNLOAD_TIMEOUT_SECONDS, context=ssl_context) as response:
        content_type = validate_media_url_response(response.headers.get("content-type", ""))
        validate_media_content_length(response.headers.get("content-length"))
        file_extension = get_media_url_extension(url, content_type)

        with tempfile.NamedTemporaryFile(suffix=file_extension or ".media", delete=False) as output_file:
            output_path = output_file.name
            total_size = 0
            while True:
                chunk = response.read(64 * 1024)
                if not chunk:
                    break
                total_size += len(chunk)
                validate_media_download_size(total_size)
                output_file.write(chunk)

    return output_path, file_extension



def validate_media_url_response(content_type_header: str) -> str:
    content_type = content_type_header.split(";", 1)[0].lower()
    if not (content_type.startswith("audio/") or content_type.startswith("video/")):
        raise RuntimeError(f"Unsupported media URL content type: {content_type}")
    return content_type



def validate_media_content_length(content_length: str | None) -> None:
    if content_length and int(content_length) > MEDIA_DOWNLOAD_MAX_BYTES:
        raise RuntimeError("Media URL is larger than the configured download limit.")



def validate_media_download_size(total_size: int) -> None:
    if total_size > MEDIA_DOWNLOAD_MAX_BYTES:
        raise RuntimeError("Media URL is larger than the configured download limit.")


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
    logger.info(
        "transcribe: start embedded media (ext=%s, %.1fKB)",
        file_extension,
        len(media_content) / 1024,
    )
    wav_path = convert_media_to_wav(media_content, file_extension)
    return transcribe_media_file(wav_path)



def transcribe_media_url(url: str) -> str:
    logger.info("transcribe: start media URL %s", url)
    started = time.perf_counter()
    input_path, file_extension = download_media_url_to_file(url)
    logger.info(
        "transcribe: downloaded %s (ext=%s, %.1fKB, %.1fms)",
        url,
        file_extension,
        Path(input_path).stat().st_size / 1024,
        (time.perf_counter() - started) * 1000,
    )
    try:
        if file_extension == ".wav":
            return transcribe_media_file(input_path)
        wav_path = convert_media_file_to_wav(input_path, file_extension)
        return transcribe_media_file(wav_path)
    finally:
        Path(input_path).unlink(missing_ok=True)



def transcribe_media_file(wav_path: str) -> str:
    try:
        try:
            from moonshine_voice.moonshine_api import ModelArch
            from moonshine_voice.transcriber import Transcriber
            from moonshine_voice.utils import get_model_path, load_wav_file
        except ImportError as exc:
            raise RuntimeError(
                "Audio/video transcription unavailable in this build (moonshine-voice not bundled)."
            ) from exc

        model_name = os.getenv("MOONSHINE_MODEL_NAME", "tiny-en")
        model_arch_name = os.getenv("MOONSHINE_MODEL_ARCH", "tiny").upper().replace("-", "_")
        model_arch = getattr(ModelArch, model_arch_name)
        audio_data, sample_rate = load_wav_file(wav_path)
        duration_s = len(audio_data) / sample_rate if sample_rate else 0
        logger.info(
            "transcribe: loaded wav (%.1fs audio @ %dHz), running model %s/%s",
            duration_s,
            sample_rate,
            model_name,
            model_arch_name,
        )
        started = time.perf_counter()
        with Transcriber(get_model_path(model_name), model_arch=model_arch) as transcriber:
            transcript = transcriber.transcribe_without_streaming(audio_data, sample_rate)
        text = "\n".join(line.text for line in transcript.lines if line.text).strip()
        logger.info(
            "transcribe: done (%d lines, %d chars, %.1fms)",
            len(transcript.lines),
            len(text),
            (time.perf_counter() - started) * 1000,
        )
        return text
    finally:
        Path(wav_path).unlink(missing_ok=True)



def convert_media_to_wav(media_content: bytes, file_extension: str | None) -> str:
    with tempfile.NamedTemporaryFile(suffix=file_extension or ".media", delete=False) as input_file:
        input_file.write(media_content)
        input_path = input_file.name
    try:
        return convert_media_file_to_wav(input_path, file_extension)
    finally:
        Path(input_path).unlink(missing_ok=True)



def convert_media_file_to_wav(input_path: str, file_extension: str | None) -> str:
    output_path = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    Path(output_path).unlink(missing_ok=True)
    logger.info("transcribe: converting %s -> wav (ffmpeg)", file_extension or "media")
    started = time.perf_counter()
    try:
        subprocess.run(
            [
                get_ffmpeg_executable(),
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
            timeout=FFMPEG_TIMEOUT_SECONDS,
        )
        logger.info(
            "transcribe: wav ready (%.1fms)", (time.perf_counter() - started) * 1000
        )
        return output_path
    except FileNotFoundError as exc:
        raise RuntimeError("Audio/video transcription requires ffmpeg.") from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Audio/video conversion timed out.") from exc


def get_ffmpeg_executable() -> str:
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        return ffmpeg_path

    try:
        import imageio_ffmpeg
    except ImportError:
        return "ffmpeg"
    return imageio_ffmpeg.get_ffmpeg_exe()


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
