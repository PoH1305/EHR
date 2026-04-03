import pandas as pd
import numpy as np

def validate_data(file_path='data/audit_logs_training.csv'):
    try:
        df = pd.read_csv(file_path)
        print(f"Loaded {len(df)} records from {file_path}")
        print("\n--- Class Distribution ---")
        print(df['is_anomaly'].value_counts(normalize=True))
        
        print("\n--- Anomaly Types ---")
        print(df['anomaly_type'].value_counts())
        
        print("\n--- Feature Means by Anomaly Type ---")
        # Feature means for numerical features
        numeric_cols = ['resource_count']
        means = df.groupby('anomaly_type')[numeric_cols].mean()
        print(means)
        
        print("\n--- Action Distribution by Anomaly Type ---")
        action_dist = pd.crosstab(df['anomaly_type'], df['action'])
        print(action_dist)

    except FileNotFoundError:
        print(f"Error: {file_path} not found. Run generate_training_data.py first.")

if __name__ == "__main__":
    validate_data()
