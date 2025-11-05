const mongoose = require('mongoose');
const Report = require('../models/Report');
const { resolvePeriodRange, buildReportPayload, formatRangeLabel } = require('../utils/reportBuilder');

const derivePeriodKeyFromLabel = (label) => {
  if (!label || typeof label !== 'string') {
    return null;
  }

  const normalized = label.trim().toLowerCase();

  if (normalized.startsWith('current month')) return 'current-month';
  if (normalized.startsWith('last month')) return 'last-month';
  if (normalized.startsWith('q1')) return 'q1';
  if (normalized.startsWith('q2')) return 'q2';
  if (normalized.startsWith('q3')) return 'q3';
  if (normalized.startsWith('q4')) return 'q4';
  if (normalized.includes('year to date')) return 'ytd';
  if (normalized === 'last year') return 'last-year';
  const yearMatch = normalized.match(/^\d{4}$/);
  if (yearMatch) {
    return 'last-year';
  }
  if (normalized.includes('90')) return 'rolling-90';

  return null;
};

exports.listReports = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const {
      periodKey,
      reportType,
      format,
      search,
      startDate: filterStart,
      endDate: filterEnd,
    } = req.query;

    const query = { user: userObjectId };

    if (periodKey) {
      query.periodKey = periodKey;
    }

    if (reportType) {
      query.reportType = reportType;
    }

    if (format) {
      query.format = format;
    }

    let reports = await Report.find(query).sort({ createdAt: -1 }).lean();

    const parsedStart = filterStart ? new Date(filterStart) : null;
    const parsedEnd = filterEnd ? new Date(filterEnd) : null;

    if ((parsedStart && Number.isNaN(parsedStart.getTime())) || (parsedEnd && Number.isNaN(parsedEnd.getTime()))) {
      return res.status(400).json({ message: 'Invalid filter date provided' });
    }

    if (parsedStart || parsedEnd) {
      reports = reports.filter((report) => {
        if (!parsedStart && !parsedEnd) {
          return true;
        }

        if (!report.startDate && !report.endDate) {
          return true;
        }

        const reportStart = report.startDate ? new Date(report.startDate) : null;
        const reportEnd = report.endDate ? new Date(report.endDate) : null;

        if (parsedStart && reportEnd && reportEnd < parsedStart) {
          return false;
        }

        if (parsedEnd && reportStart && reportStart > parsedEnd) {
          return false;
        }

        return true;
      });
    }

    if (search) {
      const term = search.trim().toLowerCase();
      if (term) {
        reports = reports.filter((report) => {
          return (
            report.name?.toLowerCase().includes(term) ||
            report.period?.toLowerCase().includes(term) ||
            report.reportType?.toLowerCase().includes(term)
          );
        });
      }
    }

    return res.json({ reports });
  } catch (error) {
    console.error('Failed to fetch reports', error);
    return res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

exports.createReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      period,
      periodKey: periodKeyInput,
      reportType,
      format,
      filePath,
      customRange,
      notes,
      payload: payloadOverride,
    } = req.body;

    if (!reportType || !format) {
      return res.status(422).json({ message: 'Report type and format are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const referenceDate = new Date();

    const derivedKey = periodKeyInput || derivePeriodKeyFromLabel(period);
    const shouldUseCustom =
      (!derivedKey && customRange?.startDate && customRange?.endDate) ||
      derivedKey === 'custom';
    const finalPeriodKey = derivedKey || (shouldUseCustom ? 'custom' : 'current-month');

    let resolvedPeriod;
    try {
      resolvedPeriod = resolvePeriodRange(finalPeriodKey, customRange, referenceDate);
    } catch (periodError) {
      return res.status(400).json({ message: periodError.message || 'Invalid period selection' });
    }

    const periodLabel = period || resolvedPeriod.label || formatRangeLabel(resolvedPeriod.start, resolvedPeriod.end);
    const periodKey = finalPeriodKey;

    const basePayload = await buildReportPayload({
      reportType,
      userId: userObjectId,
      startDate: resolvedPeriod.start,
      endDate: resolvedPeriod.end,
      periodLabel,
      referenceDate,
    });

    const composedPayload = payloadOverride
      ? {
          ...basePayload,
          ...payloadOverride,
        }
      : basePayload;

    if (notes) {
      composedPayload.notes = notes;
    }

    const reportName = (name && name.trim()) || `${reportType} - ${periodLabel}`;

    const report = await Report.create({
      user: userObjectId,
      name: reportName,
      period: periodLabel,
      periodKey,
      startDate: resolvedPeriod.start,
      endDate: resolvedPeriod.end,
      reportType,
      format,
      filePath,
      payload: composedPayload,
    });

    return res.status(201).json({ message: 'Report saved', report });
  } catch (error) {
    console.error('Failed to save report', error);
    return res.status(500).json({ message: 'Failed to save report' });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const report = await Report.findOneAndDelete({ _id: id, user: userObjectId });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    return res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error('Failed to delete report', error);
    return res.status(500).json({ message: 'Failed to delete report' });
  }
};
