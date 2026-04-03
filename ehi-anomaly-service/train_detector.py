import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import os

# Create model directory if it doesn't exist
os.makedirs("model", exist_ok=True)

# Load data
data_path = "data/audit_logs_training.csv"
if not os.path.exists(data_path):
    print(f"Error: {data_path} not found. Please run generate_training_data.py first.")
    exit(1)

df = pd.read_csv(data_path)

# Drop columns that leak the label or aren't useful for general pattern recognition
# We keep 'resource_count' and 'request_rate' as they are key features
features_to_drop = ["anomaly_type", "user_id", "timestamp", "is_anomaly"]
X = df.drop(columns=[col for col in features_to_drop if col in df.columns])
y = df["is_anomaly"]

# Encode categoricals
le_action = LabelEncoder()
le_ip = LabelEncoder()

X["action"] = le_action.fit_transform(X["action"])
X["ip_address"] = le_ip.fit_transform(X["ip_address"])

# Train Isolation Forest
print("Training Isolation Forest...")
# contamination is the proportion of outliers in the data set. 
# Our synthetic data has exactly 0.1 (200/2000)
model = IsolationForest(
    contamination=0.1,
    n_estimators=100,
    random_state=42
)
model.fit(X)

# Evaluate
preds = model.predict(X)
# IsolationForest returns -1 for outliers and 1 for inliers.
# Map to 1 for anomaly, 0 for normal to match our 'is_anomaly' column
preds_binary = [1 if p == -1 else 0 for p in preds]

print("\nClassification Report:")
print(classification_report(y, preds_binary))

# Save model and encoders
joblib.dump(model, "model/anomaly_detector.pkl")
joblib.dump(le_action, "model/le_action.pkl")
joblib.dump(le_ip, "model/le_ip.pkl")
# Save feature names to ensure consistent order during inference
joblib.dump(X.columns.tolist(), "model/feature_names.pkl")

print("\nModel and encoders saved to 'model/' directory.")
