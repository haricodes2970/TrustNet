const reportService = require("../services/reportService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure. CSV responses
// are the one place this controller does more than json()/status() — a
// file-download response can't be JSON-enveloped and still work as a
// browser/curl download, so `format=csv` bypasses the usual
// { success, data } envelope entirely, by design (see docs/modules/reports.md).

async function getReport(req, res) {
  try {
    const result = await reportService.generateReport(
      req.params.reportType,
      req.query.startupId,
      req.user.id,
      req.query.format || "json"
    );

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
