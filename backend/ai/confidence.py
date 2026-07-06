def calculate_confidence(risk_probability: float, cpu: float, memory: float) -> float:
    """
    Implements dynamic AI Confidence Score calculation based on risk and metric bounds.
    """
    # Baseline expected confidence
    base = 0.88
    
    # Confidence increases when metrics are clear indicators (e.g. very high load or very low load)
    if risk_probability > 0.85 or risk_probability < 0.15:
        base += 0.08
    elif risk_probability > 0.60 or risk_probability < 0.35:
        base += 0.04
        
    # Introduce small metric consistency variation
    metric_variance = ((cpu + memory) % 7) / 200.0
    confidence = round(min(0.99, max(0.65, base + metric_variance)), 2)
    return confidence
