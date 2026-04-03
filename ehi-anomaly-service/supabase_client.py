import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = None
if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
else:
    print("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Supabase logging will be disabled.")

def log_audit_event(event_data: dict):
    """
    Logs a raw audit event to Supabase.
    """
    if not supabase:
        print("Supabase client not initialized. Cannot log audit event.")
        return None
    try:
        # Save event to an 'audit_logs' table - adjust schema as needed
        response = supabase.table("audit_logs").insert(event_data).execute()
        return response
    except Exception as e:
        print(f"Error logging event to Supabase: {e}")
        return None

def create_alert(event_data: dict, score: float, rule_flagged: bool):
    """
    Logs an anomaly alert to Supabase.
    """
    if not supabase:
        print("Supabase client not initialized. Cannot log alert.")
        return None
        
    try:
        alert_data = {
            "user_id": event_data.get("user_id"),
            "action": event_data.get("action"),
            "ip_address": event_data.get("ip_address"),
            "resource_count": event_data.get("resource_count"),
            "score": score,
            "rule_flagged": rule_flagged,
            "event_metadata": event_data
        }
        
        response = supabase.table("anomaly_alerts").insert(alert_data).execute()
        return response
    except Exception as e:
        print(f"Error logging alert to Supabase: {e}")
        return None
