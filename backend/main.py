import os
import uuid
import base64
import httpx
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# CORS for Angular
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class OcrRequest(BaseModel):
    document_id: str
    page_index: int

@app.get("/")
async def root():
    return {"status": "Backend GLM-OCR is running"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    session_id = str(uuid.uuid4())
    session_dir = os.path.join(UPLOAD_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    file_path = os.path.join(session_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    pages = []
    if file.filename.lower().endswith(".pdf"):
        try:
            doc = fitz.open(file_path)
            for i in range(len(doc)):
                page = doc.load_page(i)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_filename = f"page_{i}.jpg"
                img_path = os.path.join(session_dir, img_filename)
                pix.save(img_path)
                pages.append(img_filename)
            doc.close()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF Processing error: {str(e)}")
    else:
        # Assume it's an image
        pages.append(file.filename)
        
    return {"document_id": session_id, "pages": pages}

@app.get("/image/{document_id}/{filename}")
async def get_image(document_id: str, filename: str):
    file_path = os.path.join(UPLOAD_DIR, document_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@app.post("/ocr")
async def perform_ocr(request: OcrRequest):
    session_dir = os.path.join(UPLOAD_DIR, request.document_id)
    
    # Try to find the image for the page index
    img_filename = f"page_{request.page_index}.jpg"
    img_path = os.path.join(session_dir, img_filename)
    
    if not os.path.exists(img_path):
        # Maybe it was a single image upload
        files = [f for f in os.listdir(session_dir) if not f.lower().endswith(".pdf")]
        if files:
             img_path = os.path.join(session_dir, files[0])
        else:
            raise HTTPException(status_code=404, detail="Image not found for this page")

    try:
        with open(img_path, "rb") as f:
            img_data = base64.b64encode(f.read()).decode("utf-8")
        
        # Ollama call as per documentation
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "glm-ocr:latest",
                    "prompt": "Parse this image into Markdown. Preserve tables and layout.",
                    "images": [img_data],
                    "stream": False
                },
                timeout=120.0
            )
            response.raise_for_status()
            result = response.json()
            return {"markdown": result.get("response", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
