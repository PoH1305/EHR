import os
import pandas as pd
import joblib
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from firebase_auth import verify_firebase_token
from supabase_client import create_alert

app = FastAPI(title="EHI Anomaly Detection Service")

# Load models
MODEL_DIR = "model"
model = None
le_action = None
le_ip = None
feature_names = None

try:
    model = joblib.load(os.path.join(MODEL_DIR, "anomaly_detector.pkl"))
    le_action = joblib.load(os.path.join(MODEL_DIR, "le_action.pkl"))
    le_ip = joblib.load(os.path.join(MODEL_DIR, "le_ip.pkl"))
    feature_names = joblib.load(os.path.join(MODEL_DIR, "feature_names.pkl"))
    print("Models loaded successfully.")
except Exception as e:
    print(f"Error loading models: {e}. Ensure training has been run.")

class AuditEvent(BaseModel):
    user_id: str
    action: str
    ip_address: str
    resource_count: int
    hour_of_day: int
    is_off_hours: bool
    request_rate: float

@app.post("/api/anomaly/check")
def check_anomaly(event: AuditEvent, user: dict = Depends(verify_firebase_token)):
    return _process_audit_event(event)

@app.post("/api/anomaly/verify")
def verify_logic(event: AuditEvent):
    """Temporary unauthenticated endpoint to verify ML model logic on Railway."""
    return _process_audit_event(event)

def _process_audit_event(event: AuditEvent):
    if model is None:
        raise HTTPException(status_code=500, detail="Machine learning models are not loaded.")

    rule_flagged = False
    score = 0.1 # Default normal score
    
    # 1. Rule-based checks (Heuristics)
    if event.resource_count > 50:
        rule_flagged = True
    if event.is_off_hours and event.resource_count > 10:
        rule_flagged = True
    if event.action.upper() == 'DELETE':
        rule_flagged = True
        
    # 2. ML Model Prediction
    action_code = -1
    ip_code = -1
    
    try:
        action_code = le_action.transform([event.action])[0]
        ip_code = le_ip.transform([event.ip_address])[0]
    except ValueError:
        # Value not seen during training -> immediately suspicious
        rule_flagged = True
        score = 0.9
    
    if not rule_flagged:
        input_dict = {
            "resource_count": event.resource_count,
            "action": action_code,
            "ip_address": ip_code,
        }
        
        try:
            input_df = pd.DataFrame([input_dict])
            if feature_names:
                input_df = input_df[[f for f in feature_names if f in input_df.columns]]
            
            prediction = model.predict(input_df)[0]
            score = 0.9 if prediction == -1 else 0.1
        except Exception as e:
            print(f"Prediction error: {e}")
            raise HTTPException(status_code=500, detail="Error during anomaly prediction.")
        
    is_anomaly = score > 0.8 or rule_flagged
    status = "flagged" if is_anomaly else "normal"
    
    if is_anomaly:
        create_alert(event.dict(), score, rule_flagged)
        
    return {
        "status": status,
        "score": score,
        "rule_flagged": rule_flagged
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok", 
        "models_loaded": model is not None
    }
