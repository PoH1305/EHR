import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth

# Initialize Firebase Admin
# It relies on the GOOGLE_APPLICATION_CREDENTIALS environment variable
# which points to the service account JSON file.
# Initialize Firebase Admin
try:
    if not firebase_admin._apps:
        # 1. Try to load from environment variable (Secure Cloud Method)
        firebase_cert_json = os.environ.get("FIREBASE_ADMIN_CERT")
        
        if firebase_cert_json:
            import json
            try:
                cert_dict = json.loads(firebase_cert_json)
                cred = credentials.Certificate(cert_dict)
                firebase_admin.initialize_app(cred)
                print("[Auth] Successfully initialized Firebase Admin via FIREBASE_ADMIN_CERT variable.")
            except Exception as json_err:
                print(f"Error parsing FIREBASE_ADMIN_CERT: {json_err}")
                firebase_admin.initialize_app()
        else:
            # 2. Fallback to GOOGLE_APPLICATION_CREDENTIALS file path
            firebase_admin.initialize_app()
            print("[Auth] Initialized Firebase Admin via local credentials file.")
except Exception as e:
    print(f"Warning: Firebase Admin initialization failed: {e}")

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
