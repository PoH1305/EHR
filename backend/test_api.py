import requests
import os

BASE_URL = "http://localhost:8000"

def test_root():
    response = requests.get(f"{BASE_URL}/")
    print(f"Root test: {response.json()}")

def test_upload():
    # Create a dummy file
    with open("test.txt", "w") as f:
        f.write("This is a test medical record.")
    
    with open("test.txt", "rb") as f:
        files = {"file": ("test.pdf", f, "application/pdf")}
        data = {"user_id": "test-user-123", "role": "patient"}
        response = requests.post(f"{BASE_URL}/upload", files=files, data=data)
        print(f"Upload test: {response.status_code} - {response.json()}")
    
    os.remove("test.txt")

if __name__ == "__main__":
    try:
        test_root()
        test_upload()
    except Exception as e:
        print(f"Test failed: {e}")
