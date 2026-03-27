import os
import uuid
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env.local")

app = FastAPI(title="Medical Records API")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Setup
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Config
UPLOAD_DIR = "../uploads"
PATIENT_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "patient_records")
DOCTOR_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "doctor_records")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

# Create directories
os.makedirs(PATIENT_UPLOAD_DIR, exist_ok=True)
os.makedirs(DOCTOR_UPLOAD_DIR, exist_ok=True)

class RecordEntry(BaseModel):
    id: str
    user_id: str
    role: str
    filename: str
    filepath: str
    uploaded_at: str
    file_type: str

@app.get("/")
def read_root():
    return {"status": "Medical Records API is running"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    role: str = Form(...)
):
    # 1. Validate role
    if role not in ["patient", "doctor"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    # 2. Validate file type
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Upload failed — invalid file type. Only PDF, JPG, PNG allowed.")

    # 3. Validate file size
    file_size = 0
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Empty file upload rejected.")

    await file.seek(0) # Reset file pointer

    # 4. Generate unique filename
    unique_filename = f"{uuid.uuid4()}{ext}"
    target_dir = DOCTOR_UPLOAD_DIR if role == "doctor" else PATIENT_UPLOAD_DIR
    file_path = os.path.join(target_dir, unique_filename)

    # 5. Save file safely
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        print(f"Write failure: {e}")
        raise HTTPException(status_code=500, detail="Permission failure or read failure on server.")

    # 6. Save metadata to Supabase
    record_data = {
        "user_id": user_id,
        "role": role,
        "filename": file.filename,
        "filepath": file_path,
        "file_type": file.content_type,
        "uploaded_at": datetime.now().isoformat()
    }

    try:
        response = supabase.table("medical_records").insert(record_data).execute()
        if not response.data:
            raise Exception("Supabase insertion failed")
        
        print(f"Upload success: {file.filename} for role {role} by user {user_id}")
        return {
            "message": "Upload successful",
            "record": response.data[0]
        }
    except Exception as e:
        print(f"Upload failure db: {e}")
        # Clean up file if DB fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Database record failure: {str(e)}")

@app.get("/records/{user_id}")
async def get_records(user_id: str):
    try:
        response = supabase.table("medical_records").select("*").eq("user_id", user_id).execute()
        records = response.data
        
        # Add download URL helper
        for r in records:
            r["download_url"] = f"/download/{r['id']}"
            
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieval failure: {str(e)}")

@app.get("/download/{record_id}")
async def download_record(record_id: str):
    try:
        response = supabase.table("medical_records").select("*").eq("id", record_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Record not found")
        
        record = response.data
        file_path = record["filepath"]
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File missing on server")
            
        return FileResponse(
            path=file_path,
            filename=record["filename"],
            media_type=record["file_type"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
