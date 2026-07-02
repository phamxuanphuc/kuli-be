# Implement API Upload HTML To Markdown

## Goal

Build a REST API endpoint that accepts one uploaded HTML file, converts it to Markdown using MarkItDown, and returns the converted content as a downloadable `.md` file.

## Endpoint contract

- Method: `POST`
- Path: `/html-file-to-markdown`
- Request type: `multipart/form-data`
- Form field name: `file`
- Input file type: HTML file, for example `index.html`
- Success response:
  - Status: `200 OK`
  - Content-Type: `text/markdown`
  - Header: `Content-Disposition: attachment; filename="<input-name>.md"`
  - Body: converted Markdown content

## Dependencies

Add these dependencies in `pyproject.toml`:

```toml
dependencies = [
    "fastapi>=0.115.0",
    "markitdown>=0.1.0",
    "python-multipart>=0.0.9",
    "uvicorn[standard]>=0.30.0",
]
```

Reason:

- `fastapi`: REST API framework.
- `markitdown`: converts HTML content to Markdown.
- `python-multipart`: required by FastAPI to handle uploaded files from `multipart/form-data`.
- `uvicorn`: runs the API server.

## Implementation steps

### 1. Import required modules

In `app/main.py`, import:

```python
from io import BytesIO

from fastapi import FastAPI, File, Response, UploadFile
from markitdown import MarkItDown
```

### 2. Create a MarkItDown instance

```python
markitdown = MarkItDown()
```

### 3. Convert HTML bytes to Markdown

Create a helper function:

```python
def convert_html_bytes_to_markdown(html_content: bytes) -> str:
    html_stream = BytesIO(html_content)
    result = markitdown.convert_stream(html_stream, file_extension=".html")
    return result.text_content
```

This keeps the API handler simple and makes conversion easy to test.

### 4. Generate the output filename

Create a helper function:

```python
def get_markdown_filename(filename: str | None) -> str:
    if not filename:
        return "converted.md"
    name = filename.rsplit(".", 1)[0]
    return f"{name}.md"
```

Examples:

- `index.html` becomes `index.md`
- `page.htm` becomes `page.md`
- missing filename becomes `converted.md`

### 5. Add the upload endpoint

```python
@app.post("/html-file-to-markdown", response_class=Response)
async def html_file_to_markdown(file: UploadFile = File(...)) -> Response:
    html_content = await file.read()
    markdown = convert_html_bytes_to_markdown(html_content)
    markdown_filename = get_markdown_filename(file.filename)
    return Response(
        content=markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{markdown_filename}"'},
    )
```

## Test plan

Add a test in `tests/test_main.py`.

Use `monkeypatch` to replace the real MarkItDown conversion with a fake converter. This keeps the API test focused on upload behavior, response headers, and response body.

```python
def test_html_file_to_markdown(monkeypatch) -> None:
    def fake_convert_html_bytes_to_markdown(html_content: bytes) -> str:
        assert html_content == b"<h1>Hello</h1>"
        return "# Hello"

    monkeypatch.setattr(
        "app.main.convert_html_bytes_to_markdown",
        fake_convert_html_bytes_to_markdown,
    )

    response = client.post(
        "/html-file-to-markdown",
        files={"file": ("hello.html", b"<h1>Hello</h1>", "text/html")},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert response.headers["content-disposition"] == 'attachment; filename="hello.md"'
    assert response.text == "# Hello"
```

## Manual verification

Start the server:

```bash
uvicorn app.main:app --reload
```

Call the API:

```bash
curl -X POST http://127.0.0.1:8000/html-file-to-markdown \
  -F "file=@index.html;type=text/html" \
  -o index.md
```

Expected result:

- The response status is `200`.
- The downloaded file is `index.md`.
- The downloaded file contains Markdown converted from the uploaded HTML.

## Success criteria

The implementation is complete when:

- `POST /html-file-to-markdown` accepts one uploaded HTML file through the `file` form field.
- The endpoint returns Markdown content with `Content-Type: text/markdown`.
- The response includes `Content-Disposition` so clients can download a `.md` file.
- The upload API test passes.
- `python3 -m compileall app tests` passes.
