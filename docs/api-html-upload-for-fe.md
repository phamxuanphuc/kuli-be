# API Upload HTML To Markdown For FE

## Overview

This API lets FE upload one HTML file and receive a Markdown file in the response.

## Endpoint

```http
POST /html-file-to-markdown
```

Base URL in local development:

```text
http://127.0.0.1:8000
```

Full local URL:

```text
http://127.0.0.1:8000/html-file-to-markdown
```

## Request

### Headers

Do not manually set `Content-Type` when using browser `FormData`.
The browser will set `multipart/form-data` with the correct boundary automatically.

### Body

Request body must be `multipart/form-data`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | `File` | Yes | HTML file to convert, for example `index.html` |

## Success response

Status:

```http
200 OK
```

Headers:

```http
Content-Type: text/markdown; charset=utf-8
Content-Disposition: attachment; filename="index.md"
```

Body:

```text
# Converted markdown content
```

The response body is Markdown text. FE can read it as text or download it as a `.md` file.

## Error responses

If FE does not send the `file` field, FastAPI returns validation error:

```http
422 Unprocessable Entity
```

Example response:

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "file"],
      "msg": "Field required"
    }
  ]
}
```

## FE example: upload and get Markdown text

```ts
async function convertHtmlFileToMarkdown(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://127.0.0.1:8000/html-file-to-markdown", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Convert failed: ${response.status}`);
  }

  return response.text();
}
```

## FE example: upload and download `.md` file

```ts
async function uploadHtmlAndDownloadMarkdown(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://127.0.0.1:8000/html-file-to-markdown", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Convert failed: ${response.status}`);
  }

  const markdownBlob = await response.blob();
  const downloadUrl = URL.createObjectURL(markdownBlob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = file.name.replace(/\.[^/.]+$/, "") + ".md";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}
```

## FE example: React file input

```tsx
import { ChangeEvent } from "react";

export function HtmlUploadButton() {
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadHtmlAndDownloadMarkdown(file);
  }

  return <input type="file" accept=".html,.htm,text/html" onChange={handleFileChange} />;
}
```

## cURL example

```bash
curl -X POST http://127.0.0.1:8000/html-file-to-markdown \
  -F "file=@index.html;type=text/html" \
  -o index.md
```

## Important notes for FE

- Use form field name exactly as `file`.
- Use `FormData` and append the selected `File` object.
- Do not set `Content-Type` manually in browser fetch.
- Treat the successful response as `text/markdown` or as a downloadable blob.
- If the server is on another domain, BE must enable CORS for the FE origin.
