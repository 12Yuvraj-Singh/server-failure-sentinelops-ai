import time
import json
import random
from kafka import KafkaProducer

KAFKA_BROKER = 'localhost:9092'
TOPIC_NAME = 'server_metrics'

# Initialize Kafka Producer
producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BROKER],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

SERVER_IDS = [f"DC-{i:03d}" for i in range(1, 21)]

def generate_metric(server_id):
    """Simulates realistic server metrics."""
    return {
        "server_id": server_id,
        "timestamp": int(time.time()),
        "cpu_usage": round(random.uniform(10.0, 99.0), 2),
        "memory_usage": round(random.uniform(20.0, 95.0), 2),
        "disk_io": round(random.uniform(50.0, 500.0), 2),
        "network_latency": round(random.uniform(5.0, 200.0), 2),
        "crash_frequency": random.randint(0, 5)
    }

def start_ingestion():
    print(f"Starting simulated data ingestion to {TOPIC_NAME} on {KAFKA_BROKER}...")
    try:
        while True:
            for server_id in SERVER_IDS:
                metric = generate_metric(server_id)
                producer.send(TOPIC_NAME, metric)
                print(f"Sent: {metric}")
            time.sleep(2)  # Simulate metrics every 2 seconds
    except KeyboardInterrupt:
        print("Stopping ingestion...")
    finally:
        producer.close()

if __name__ == "__main__":
    start_ingestion()
