import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth

# Initialize Firebase Admin
# It relies on the GOOGLE_APPLICATION_CREDENTIALS environment variable
# which points to the service account JSON file.
try:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
except ValueError:
    # Already initialized
    pass
except Exception as e:
    print(f"Warning: Firebase Admin initialization failed: {e}")
    print("Set GOOGLE_APPLICATION_CREDENTIALS pointing to your service account JSON file.")

security = HTTPBearer()

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to verify a Firebase ID token.
    Extracts Bearer token from the Authorization header and verifies it via Firebase Admin SDK.
    """
    token = credentials.credentials
    try:
        # Verify the ID token. 
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
