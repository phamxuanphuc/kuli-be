# Python REST API

REST API toi gian dung FastAPI.

## Yeu cau

- Python 3.10+

## Cai dat

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Chay server

```bash
uvicorn app.main:app --reload
```

API se chay tai `http://127.0.0.1:8000`.

## Endpoint

- `GET /` tra ve thong diep chao mung.
- `GET /health` tra ve trang thai service.
- `POST /html-to-markdown` nhan HTML va tra ve Markdown voi `Content-Type: text/markdown`.
- `POST /html-file-to-markdown` upload file HTML va tra ve file Markdown `.md`.
- `POST /file-to-markdown` upload file bat ky MarkItDown ho tro va tra ve file Markdown `.md`. Neu file la audio/video, service se dung Moonshine Voice de transcription va dinh kem noi dung transcription vao Markdown. Neu file HTML co audio/video dang `data:` URI hoac URL `http/https`, transcription se duoc chen ngay duoi the media trong Markdown.

Vi du chuyen HTML tu JSON:

```bash
curl -X POST http://127.0.0.1:8000/html-to-markdown \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Hello</h1><p>World</p>"}'
```

Vi du upload file HTML va luu ket qua thanh file Markdown:

```bash
curl -X POST http://127.0.0.1:8000/html-file-to-markdown \
  -F "file=@index.html;type=text/html" \
  -o index.md
```

Vi du upload audio/video va luu ket qua Markdown kem transcription:

```bash
curl -X POST http://127.0.0.1:8000/file-to-markdown \
  -F "file=@meeting.mp3;type=audio/mpeg" \
  -o meeting.md
```

Luu y: transcription audio/video dung `moonshine-voice` va can co `ffmpeg` tren may chay server de tach/chuan hoa audio tu video, MP3, MP4, M4A. Mac dinh service dung model `base-en`; co the doi bang bien moi truong `MOONSHINE_MODEL_NAME` va `MOONSHINE_MODEL_ARCH` neu server da co model tuong ung. Media URL trong HTML chi ho tro `http/https`, gioi han tai mac dinh 150MB (`MEDIA_DOWNLOAD_MAX_BYTES`) va timeout mac dinh 60 giay (`MEDIA_DOWNLOAD_TIMEOUT_SECONDS`). Service dung CA bundle tu `certifi` khi tai media URL HTTPS de tranh loi SSL local thieu certificate.

## Deploy len Vercel

Du an da co cau hinh Vercel:

- `api/index.py` export FastAPI app cho Vercel Python runtime.
- `vercel.json` route tat ca request ve `api/index.py`.
- `requirements.txt` khai bao dependencies de Vercel cai dat.

Cach deploy:

```bash
vercel
```

Hoac deploy production:

```bash
vercel --prod
```

## Chay test

```bash
pytest
```
