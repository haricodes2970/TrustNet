const reportService = require("../services/reportService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure. CSV responses
// are the one place this controller does more than json()/status() — a
// file-download response can't be JSON-enveloped and still work as a
// browser/curl download, so `format=csv` bypasses the usual
// { success, data } envelope entirely, by design (see docs/modules/reports.md).

// Reports has no single persisted document to key an audit log entry on
// (it's a computed export, not a resource) - startupId stands in as the
// target, same "closest equivalent" reasoning used for Notification's
// markAllRead bulk action. Logged only on success: a failed/unauthorized
// attempt is already visible via the 403/404 response itself, and logging
// it too would let an unrelated caller probe for a startup's existence via
// the audit trail.
function logReportGenerated(req, reportType, startupId, format) {
  auditLogService
    .createLog({
      actor: req.user.id,
      action: "report.generate",
      targetType: "Report",
      targetId: startupId,
      details: { reportType, format },
      ip: req.ip,
    })
    .catch((error) => {
      console.error(`[audit] Failed to log "report.generate" by ${req.user.id}: ${error.message}`);
    });
}

async function getReport(req, res) {
  try {
    const format = req.query.format || "json";
    const result = await reportService.generateReport(
      req.params.reportType,
      req.query.startupId,
      req.user.id,
      format
    );
    logReportGenerated(req, req.params.reportType, req.query.startupId, format);

    if (result.format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.reportType}-report.csv"`);
      return res.status(200).send(result.csv);
    }

    return res.status(200).json({ success: true, data: result.report });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  getReport,
};
