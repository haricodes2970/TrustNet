const auditLogService = require("../services/auditLogService");

function buildFilter(query) {
  const filter = {};
  if (query.actor) filter.actor = query.actor;
  if (query.action) filter.action = query.action;
  if (query.targetType) filter.targetType = query.targetType;
  if (query.targetId) filter.targetId = query.targetId;
  return filter;
}

async function listActivityLogs(req, res) {
  try {
    const filter = buildFilter(req.query);
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const skip = req.query.skip ? Number(req.query.skip) : 0;

    const [logs, total] = await Promise.all([
      auditLogService.listLogs(filter, { limit, skip }),
      auditLogService.countLogs(filter),
    ]);

    return res.status(200).json({ success: true, data: logs, meta: { total, limit, skip } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { listActivityLogs };
