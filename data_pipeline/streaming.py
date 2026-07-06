import json
from kafka import KafkaConsumer

KAFKA_BROKER = 'localhost:9092'
TOPIC_NAME = 'server_metrics'

def process_stream():
    """Consumes metrics from Kafka, applies cleaning, and prepares features."""
    consumer = KafkaConsumer(
        TOPIC_NAME,
        bootstrap_servers=[KAFKA_BROKER],
        auto_offset_reset='latest',
        enable_auto_commit=True,
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    
    print("Listening to Kafka stream for feature engineering...")
    
    for message in consumer:
        metric = message.value
        
        # Data Cleaning
        if metric.get("cpu_usage") is None:
            metric["cpu_usage"] = 50.0  # Impute
            
        # Feature Engineering
        metric["cpu_to_memory_ratio"] = round(metric["cpu_usage"] / max(metric["memory_usage"], 1), 2)
        metric["risk_score"] = (metric["cpu_usage"] * 0.4) + (metric["memory_usage"] * 0.4) + (metric["crash_frequency"] * 5)
        
        # Output to Feature Store (Mocking Feast integration here)
        print(f"Processed Feature Vector -> {metric['server_id']}: Risk={metric['risk_score']:.2f}")

if __name__ == "__main__":
    process_stream()
