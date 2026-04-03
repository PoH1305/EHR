import pandas as pd
import numpy as np
from faker import Faker
import random
from datetime import datetime, timedelta
import os

fake = Faker()
np.random.seed(42)
random.seed(42)

def generate_data(n_total=2000, n_anomalies=200):
    n_normal = n_total - n_anomalies
    data = []

    # 1. Generate Normal Data (1800)
    for _ in range(n_normal):
        # Office hours (9:00 - 17:00)
        hour = random.randint(9, 17)
        timestamp = datetime.now().replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
        
        data.append({
            'user_id': f'user_{random.randint(100, 999)}',
            'timestamp': timestamp.isoformat(),
            'resource_count': random.randint(1, 10),
            'action': random.choice(['GET', 'GET', 'GET', 'POST']),
            'ip_address': f'192.168.1.{random.randint(2, 254)}',
            'is_anomaly': 0,
            'anomaly_type': 'none'
        })

    # 2. Generate Anomalies (200 total, 40 each)
    anomaly_types = ['bulk_access', 'off_hours', 'foreign_ip', 'mass_delete', 'rapid_fire']
    per_type = n_anomalies // len(anomaly_types)

    for a_type in anomaly_types:
        for _ in range(per_type):
            hour = random.randint(9, 17)
            timestamp = datetime.now().replace(hour=hour, minute=random.randint(0, 59))
            res_count = random.randint(1, 10)
            action = random.choice(['GET', 'POST'])
            ip = f'192.168.1.{random.randint(2, 254)}'

            if a_type == 'bulk_access':
                res_count = random.randint(200, 1000)
            elif a_type == 'off_hours':
                hour = random.choice([23, 0, 1, 2, 3, 4])
                timestamp = timestamp.replace(hour=hour)
            elif a_type == 'foreign_ip':
                ip = f'{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}'
            elif a_type == 'mass_delete':
                action = 'DELETE'
                res_count = random.randint(50, 100)
            elif a_type == 'rapid_fire':
                # Simulated by very high resource count in a "single" log entry
                res_count = random.randint(500, 2000)

            data.append({
                'user_id': f'user_{random.randint(100, 999)}',
                'timestamp': timestamp.isoformat(),
                'resource_count': res_count,
                'action': action,
                'ip_address': ip,
                'is_anomaly': 1,
                'anomaly_type': a_type
            })

    df = pd.DataFrame(data)
    # Shuffle the data
    df = df.sample(frac=1).reset_index(drop=True)
    
    # Create directory if doesn't exist
    os.makedirs('data', exist_ok=True)
    file_path = 'data/audit_logs_training.csv'
    df.to_csv(file_path, index=False)
    print(f"Generated {len(df)} records to {file_path}")
    print(f"Anomalies: {df['is_anomaly'].sum()}")
    print(df['anomaly_type'].value_counts())

if __name__ == "__main__":
    generate_data()
