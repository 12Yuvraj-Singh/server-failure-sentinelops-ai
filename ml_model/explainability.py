import shap
import numpy as np

class Explainer:
    def __init__(self, model):
        self.explainer = shap.Explainer(model)
        
    def explain(self, features):
        """
        Computes SHAP values for a single prediction.
        features: numpy array of shape (1, n_features)
        """
        shap_values = self.explainer(features)
        
        # Format for API response
        feature_names = ["CPU", "Memory", "Disk IO", "Network", "Crash Frequency"]
        contributions = shap_values.values[0]
        
        explanation = [
            {"feature": name, "contribution": round(float(contrib), 4)}
            for name, contrib in zip(feature_names, contributions)
        ]
        # Sort by absolute contribution
        explanation.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        return explanation
