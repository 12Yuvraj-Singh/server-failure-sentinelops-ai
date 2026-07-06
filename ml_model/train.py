import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score
import mlflow
import mlflow.sklearn

def generate_dummy_data(n_samples=1000):
    np.random.seed(42)
    # CPU, Memory, Disk IO, Network, Crash Frequency
    X = np.random.rand(n_samples, 5) * 100
    # Add some rules for failure (y=1)
    y = ((X[:, 0] > 80) & (X[:, 1] > 85)).astype(int)
    return train_test_split(X, y, test_size=0.2, random_state=42)

def train_model():
    X_train, X_test, y_train, y_test = generate_dummy_data()
    
    mlflow.set_experiment("Server_Failure_Prediction")
    
    with mlflow.start_run():
        clf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
        clf.fit(X_train, y_train)
        
        preds = clf.predict(X_test)
        
        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds, zero_division=0)
        rec = recall_score(y_test, preds, zero_division=0)
        
        mlflow.log_metric("accuracy", acc)
        mlflow.log_metric("precision", prec)
        mlflow.log_metric("recall", rec)
        mlflow.log_param("model_type", "RandomForest")
        
        mlflow.sklearn.log_model(clf, "model")
        print(f"Model trained and logged to MLflow. Accuracy: {acc:.2f}")

if __name__ == "__main__":
    train_model()
