from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import io
import csv
import time
from backend.utils.state import SERVERS, REMEDIATION_LOGS, get_metrics_summary

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/download")
def download_report(format_type: str = Query("csv", alias="format")):
    """
    Generates CSV, TXT (Incident Summary), or AI Health PDF reports.
    """
    summary = get_metrics_summary()
    
    if format_type == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Server ID", "Environment Type", "CPU Usage %", "Memory Usage %", "Disk I/O MB/s", "Latency ms", "Temperature C", "Risk Probability", "Confidence", "Status"])
        for s in SERVERS.values():
            writer.writerow([s["id"], s["type"], s["cpu_usage"], s["memory_usage"], s["disk_io"], s["network_latency"], s["temperature"], s["risk_probability"], s.get("confidence", 0.90), s["status"]])
        
        # Stream response
        response = StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=sentinelops_fleet_dataset.csv"
        return response
        
    elif format_type == "txt" or format_type == "incident":
        output = io.StringIO()
        output.write("=====================================================\n")
        output.write("       SENTINELOPS AI INCIDENT SUMMARY REPORT        \n")
        output.write("=====================================================\n\n")
        output.write(f"Generated At: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}\n")
        output.write(f"Fleet Health Score: {summary['health_score']}%\n")
        output.write(f"Total Monitored Nodes: {summary['total_monitored']}\n")
        output.write(f"Critical Alerts: {summary['critical_alerts']}\n")
        output.write(f"High Risk Alerts: {summary['high_risk_alerts']}\n\n")
        
        output.write("CRITICAL & HIGH RISK NODE ANALYSIS:\n")
        criticals = [s for s in SERVERS.values() if s["status"] in ["Critical", "High Risk"]]
        if not criticals:
            output.write("No critical risk servers registered in the fleet.\n")
        else:
            for s in criticals:
                rec = s.get("ai_recommendation", {})
                output.write(f"- Node: {s['id']} ({s['type']})\n")
                output.write(f"  Risk Probability: {int(s['risk_probability']*100)}% (Confidence: {int(s.get('confidence',0.9)*100)}%)\n")
                output.write(f"  Telemetry: CPU {s['cpu_usage']}% | MEM {s['memory_usage']}% | I/O {s['disk_io']} MB/s\n")
                output.write(f"  AI Co-Pilot Recommendation: {rec.get('action', 'N/A')}\n")
                output.write(f"  Expected Success Rate: {int(rec.get('success_rate', 0.9)*100)}% | Downtime Saved: {rec.get('downtime_saved', 0)} mins\n\n")
                
        output.write("RECENT REMEDIATION HISTORY:\n")
        for log in REMEDIATION_LOGS[:5]:
            output.write(f"- [{log['server_id']}] {log['action']} ({log['triggered_by']}) -> {log['result']}\n")
            
        response = StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/plain")
        response.headers["Content-Disposition"] = "attachment; filename=sentinelops_incident_report.txt"
        return response
        
    elif format_type == "pdf" or format_type == "health":
        # Simulate PDF binary output
        pdf_bytes = b"%PDF-1.4 ... (SentinelOps Enterprise AI Platform Health PDF Report)"
        response = StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf")
        response.headers["Content-Disposition"] = "attachment; filename=sentinelops_health_report.pdf"
        return response
        
    else:
        raise HTTPException(status_code=400, detail="Invalid report format requested")
