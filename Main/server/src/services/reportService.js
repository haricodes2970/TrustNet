const analyticsService = require("./analyticsService");
const ApiError = require("../utils/ApiError");
const { handleServiceError } = require("./serviceUtils");

// Reports is a presentation/export layer over Analytics — no domain model
// is ever queried directly here. Every report type dispatches to an
// existing analyticsService function; Reports adds only export-format
// serialization (JSON passthrough, hand-rolled CSV) and a thin envelope
// (reportType/startupId/generatedAt) around whatever Analytics returns.
//
// Authorization is reused, not re-implemented: analyticsService.resolveStartupAccess
// and analyticsService.assertAnyRole are imported directly rather than a
// seventh local resolveStartupAccess() copy — Reports is an extension of
// Analytics, not a new Startup-authority domain, per explicit instruction.
// assertOwnerOrAdmin() below narrows Analytics' any-role gate down to
// owner/admin only (reports are exportable/downloadable, a higher
// exfiltration risk than an in-app read) — contributor gets 403 here even
// though the same contributor could view the equivalent data via
// /analytics/*.
//
// Error typing: 400 invalid reportType/format or missing startupId
// (checked before any authorization/DB work), 404 startup not found, 403
// no role at all, or a role below owner/admin. No 409 — same as Analytics,
// nothing here is ever mutated.

async function assertOwnerOrAdmin(startupId, userId) {
  await analyticsService.assertAnyRole(startupId, userId);
  const access = await analyticsService.resolveStartupAccess(startupId, userId);
  if (access.role !== "owner" && access.role !== "admin") {
    throw new ApiError(403, "Only the startup owner or admin may generate reports.");
  }
}

const REPORT_GENERATORS = {
  startup: analyticsService.getOverview,
  projects: analyticsService.getProjectAnalytics,
  tasks: analyticsService.getTaskAnalytics,
  hiring: analyticsService.getHiringAnalytics,
  funding: analyticsService.getFundingAnalytics,
  marketplace: analyticsService.getMarketplaceAnalytics,
};

// Pure, database-independent. Escapes a single CSV field per RFC 4180:
// wraps in quotes (doubling any embedded quotes) whenever the value
// contains a comma, quote, or newline.
function escapeCsvField(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Pure, database-independent. Recursively flattens a nested report object
// into [dotted.key, scalarValue] pairs — works identically across all six
// report shapes (a handful of scalars plus one or more byStatus count
// maps) without a report-type-specific serializer.
function flattenToRows(value, prefix = "") {
  if (value instanceof Date) {
    return [[prefix, value.toISOString()]];
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, val]) =>
      flattenToRows(val, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [[prefix, value]];
}

// Pure, database-independent. Renders a report envelope as CSV text
// (metric,value rows, CRLF line endings per RFC 4180).
function toCsv(report) {
  const rows = flattenToRows(report);
  const lines = rows.map(([key, val]) => `${escapeCsvField(key)},${escapeCsvField(val)}`);
  return ["metric,value", ...lines].join("\r\n");
}

async function generateReport(reportType, startupId, userId, format = "json") {
  try {
    const generator = REPORT_GENERATORS[reportType];
    if (!generator) {
      throw new ApiError(400, `Invalid report type: "${reportType}".`);
    }
    if (format !== "json" && format !== "csv") {
      throw new ApiError(400, `Invalid format: "${format}".`);
    }

    await assertOwnerOrAdmin(startupId, userId);

    const data = await generator(startupId, userId);
    const report = {
      reportType,
      startupId,
      generatedAt: new Date().toISOString(),
      data,
    };

    if (format === "csv") {
      return { format: "csv", csv: toCsv(report) };
    }
    return { format: "json", report };
  } catch (error) {
    throw handleServiceError(error, "Failed to generate report.");
  }
}

module.exports = {
  assertOwnerOrAdmin,
  escapeCsvField,
  flattenToRows,
  toCsv,
  generateReport,
};
