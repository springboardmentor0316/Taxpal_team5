import React, { useEffect, useMemo, useState } from 'react';
import './reports.css';
import {
  fetchReports,
  createReport,
  deleteReport,
} from '../../services/api';
import { useToast } from '../toast/ToastProvider';
import { useModal } from '../modal/ModalProvider';
import {
  exportReportAsCSV,
  exportReportAsPDF,
  exportReportAsXLSX,
  normalizeReportPayload,
} from '../../utils/reportExport';

const REPORT_TYPES = [
  {
    value: 'Income Statement',
    description: 'Compare revenue and expenses to understand profitability for the selected window.',
  },
  {
    value: 'Balance Sheet',
    description: 'Review assets, liabilities, and equity balances up to the end of the chosen period.',
  },
  {
    value: 'Cash Flow',
    description: 'Track inflows and outflows to see net cash trends across the time range.',
  },
  {
    value: 'Expense Summary',
    description: 'Highlight spending by category and surface the highest-cost transactions.',
  },
];

const PERIODS = [
  { id: 'current-month', label: 'Current Month', description: 'From the first of this month through today.' },
  { id: 'last-month', label: 'Last Month', description: 'The complete month before the current one.' },
  { id: 'q1', label: 'Q1', description: 'January through March of this year.' },
  { id: 'q2', label: 'Q2', description: 'April through June of this year.' },
  { id: 'q3', label: 'Q3', description: 'July through September of this year.' },
  { id: 'q4', label: 'Q4', description: 'October through December of this year.' },
  { id: 'ytd', label: 'Year to Date', description: 'All activity from January 1 until today.' },
  { id: 'last-year', label: 'Last Year', description: 'The full prior calendar year.' },
  { id: 'rolling-90', label: 'Last 90 Days', description: 'Rolling view of the most recent ninety days.' },
  { id: 'custom', label: 'Custom Range', description: 'Choose an explicit start and end date.' },
];

const FORMATS = [
  { value: 'PDF', description: 'Shareable PDF with headings and tables.' },
  { value: 'CSV', description: 'Spreadsheet-friendly comma separated export.' },
  { value: 'XLSX', description: 'Excel workbook with a sheet per section.' },
];

const defaultForm = {
  name: '',
  type: REPORT_TYPES[0].value,
  periodKey: PERIODS[0].id,
  format: FORMATS[0].value,
  customStart: '',
  customEnd: '',
  notes: '',
  autoName: true,
};

const defaultFilters = {
  search: '',
  periodKey: 'all',
  reportType: 'all',
  format: 'all',
  startDate: '',
  endDate: '',
};

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const rangeFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const formatMetricValue = (value, format) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return value ?? '—';
  }
  if (format === 'percentage') {
    return `${percentFormatter.format(value)}%`.replace('%%', '%');
  }
  return numberFormatter.format(value);
};

const formatDelta = (delta) => {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) {
    return null;
  }
  const prefix = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return `${prefix}${Math.abs(delta).toFixed(1)}% vs previous`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return dateTimeFormatter.format(date);
};

const formatRangeLabel = (start, end) => {
  if (!start && !end) {
    return 'Custom range';
  }
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const startValid = startDate && !Number.isNaN(startDate.getTime());
  const endValid = endDate && !Number.isNaN(endDate.getTime());

  if (startValid && endValid) {
    return `${rangeFormatter.format(startDate)} – ${rangeFormatter.format(endDate)}`;
  }
  if (startValid) {
    return `${rangeFormatter.format(startDate)} onward`;
  }
  if (endValid) {
    return `Through ${rangeFormatter.format(endDate)}`;
  }
  return 'Custom range';
};

const getPeriodLabel = (periodKey, customStart, customEnd) => {
  if (periodKey === 'custom') {
    return formatRangeLabel(customStart, customEnd);
  }
  const period = PERIODS.find((item) => item.id === periodKey);
  return period?.label || 'Custom range';
};

const makeReportName = (type, periodLabel) => `${type} - ${periodLabel}`;

const serializeFilters = (filters) => {
  const params = {};
  if (filters.periodKey && filters.periodKey !== 'all') {
    params.periodKey = filters.periodKey;
  }
  if (filters.reportType && filters.reportType !== 'all') {
    params.reportType = filters.reportType;
  }
  if (filters.format && filters.format !== 'all') {
    params.format = filters.format;
  }
  if (filters.search) {
    params.search = filters.search.trim();
  }
  if (filters.startDate) {
    params.startDate = filters.startDate;
  }
  if (filters.endDate) {
    params.endDate = filters.endDate;
  }
  return params;
};

const processReportResponse = (report) => {
  const payload = normalizeReportPayload(report.payload, report);
  return {
    ...report,
    id: report._id || report.id,
    payload,
    generatedAt: report.createdAt,
    periodLabel: report.period,
  };
};

const buildPrintableHtml = (report) => {
  const payload = normalizeReportPayload(report.payload, report);
  const header = `
    <header>
      <h1>${payload.title || 'Financial Report'}</h1>
      ${payload.subtitle ? `<p class="sub">${payload.subtitle}</p>` : ''}
      ${payload.generatedAt ? `<p class="meta">Generated ${formatDateTime(payload.generatedAt)}</p>` : ''}
    </header>
  `;

  const sections = (payload.sections || [])
    .map((section) => {
      if (section.type === 'metrics') {
        const metrics = (section.items || [])
          .map((item) => {
            const delta = formatDelta(item.delta);
            return `
              <div class="metric-row">
                <div class="metric-name">${item.label || ''}</div>
                <div class="metric-value">
                  ${formatMetricValue(item.value, item.format)}
                  ${delta ? `<span class="metric-delta">${delta}</span>` : ''}
                </div>
              </div>
            `;
          })
          .join('');
        return `
          <section>
            <h2>${section.title || 'Metrics'}</h2>
            <div class="metrics">${metrics || '<p class="empty">No metrics available.</p>'}</div>
          </section>
        `;
      }

      if (section.type === 'table') {
        const headers = (section.headers || [])
          .map((header) => `<th>${header}</th>`)
          .join('');
        const rows = (section.rows || [])
          .map((row) => {
            const cells = (row.cells || []).map((cell, index) => {
              const format = (row.formats || [])[index];
              return `<td>${formatMetricValue(cell, format)}</td>`;
            });
            return `<tr>${cells.join('')}</tr>`;
          })
          .join('');
        const footer = section.footer
          ? `<tfoot><tr><td colspan="${Math.max(section.headers?.length || 1, 1)}">${section.footer.label || ''}: ${formatMetricValue(section.footer.value, section.footer.format)}</td></tr></tfoot>`
          : '';
        return `
          <section>
            <h2>${section.title || 'Details'}</h2>
            ${
              rows
                ? `<table>
                    ${headers ? `<thead><tr>${headers}</tr></thead>` : ''}
                    <tbody>${rows}</tbody>
                    ${footer}
                  </table>`
                : `<p class="empty">${section.emptyMessage || 'No data available.'}</p>`
            }
          </section>
        `;
      }

      if (section.type === 'text') {
        return `
          <section>
            <h2>${section.title || 'Notes'}</h2>
            <p>${section.body || ''}</p>
          </section>
        `;
      }

      return '';
    })
    .join('');

  const notes = payload.notes
    ? `<section><h2>Notes</h2><p>${payload.notes}</p></section>`
    : '';

  return `
    <html>
      <head>
        <title>${payload.title || 'Financial Report'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 32px; color: #111827; }
          header { margin-bottom: 32px; }
          h1 { margin: 0 0 8px 0; font-size: 24px; }
          h2 { margin: 24px 0 8px 0; font-size: 18px; }
          .sub { color: #4b5563; margin: 0 0 4px 0; }
          .meta { color: #6b7280; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #e5e7eb; text-align: left; padding: 8px; font-size: 13px; }
          th { background: #f3f4f6; }
          .metrics { display: flex; flex-direction: column; gap: 6px; }
          .metric-row { display: flex; justify-content: space-between; border: 1px solid #e5e7eb; padding: 8px; border-radius: 6px; }
          .metric-delta { display: block; color: #2563eb; font-size: 11px; margin-top: 2px; }
          .empty { color: #6b7280; font-style: italic; }
        </style>
      </head>
      <body>
        ${header}
        ${sections || '<p class="empty">No data to display.</p>'}
        ${notes}
        <script>window.print();</script>
      </body>
    </html>
  `;
};

export default function Reports() {
  const [form, setForm] = useState(defaultForm);
  const [filters, setFilters] = useState(defaultFilters);
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useModal();

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      try {
        setLoading(true);
        const params = serializeFilters(filters);
        const response = await fetchReports(params);
        if (cancelled) return;

        const normalized = (response.reports || []).map(processReportResponse);
        setReports(normalized);
        if (normalized.length > 0) {
          setSelectedId((prev) => {
            if (prev && normalized.some((report) => report.id === prev)) {
              return prev;
            }
            return normalized[0].id;
          });
        } else {
          setSelectedId(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error.message || 'Failed to load reports';
          showToast({ message, type: 'error' });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [filters, showToast]);

  useEffect(() => {
    if (!form.autoName) {
      return;
    }
    const periodLabel = getPeriodLabel(form.periodKey, form.customStart, form.customEnd);
    const generatedName = makeReportName(form.type, periodLabel);
    if (form.name !== generatedName) {
      setForm((prev) => ({
        ...prev,
        name: generatedName,
      }));
    }
  }, [form.type, form.periodKey, form.customStart, form.customEnd, form.autoName, form.name]);

  const selected = useMemo(
    () => reports.find((report) => report.id === selectedId) || null,
    [reports, selectedId]
  );

  const previewPayload = useMemo(
    () => (selected ? normalizeReportPayload(selected.payload, selected) : null),
    [selected]
  );

  const selectedType = useMemo(
    () => REPORT_TYPES.find((type) => type.value === form.type),
    [form.type]
  );
  const selectedPeriod = useMemo(
    () => PERIODS.find((period) => period.id === form.periodKey),
    [form.periodKey]
  );
  const selectedFormat = useMemo(
    () => FORMATS.find((format) => format.value === form.format),
    [form.format]
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'name' ? { autoName: false } : null),
    }));
  };

  const handleAutoNameToggle = (event) => {
    const { checked } = event.target;
    setForm((prev) => ({
      ...prev,
      autoName: checked,
      name: checked
        ? makeReportName(prev.type, getPeriodLabel(prev.periodKey, prev.customStart, prev.customEnd))
        : prev.name,
    }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (form.periodKey === 'custom') {
      if (!form.customStart || !form.customEnd) {
        showToast({ message: 'Select a start and end date for the custom period.', type: 'error' });
        return;
      }
      if (new Date(form.customStart) > new Date(form.customEnd)) {
        showToast({ message: 'The start date must be on or before the end date.', type: 'error' });
        return;
      }
    }

    const periodLabel = getPeriodLabel(form.periodKey, form.customStart, form.customEnd);
    const payload = {
      name: (form.name && form.name.trim()) || makeReportName(form.type, periodLabel),
      reportType: form.type,
      format: form.format,
      periodKey: form.periodKey,
      period: periodLabel,
    };

    if (form.periodKey === 'custom') {
      payload.customRange = {
        startDate: form.customStart,
        endDate: form.customEnd,
        label: periodLabel,
      };
    }

    if (form.notes && form.notes.trim()) {
      payload.notes = form.notes.trim();
    }

    try {
      setSaving(true);
      const response = await createReport(payload);
      const normalized = processReportResponse(response.report);
      setReports((prev) => [normalized, ...prev]);
      setSelectedId(normalized.id);
      setForm((prev) => ({
        ...prev,
        notes: '',
      }));
      showToast({ message: 'Report generated successfully' });
    } catch (error) {
      const message = error.message || 'Failed to generate report';
      showToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm((prev) => ({
      ...defaultForm,
      type: prev.type,
      periodKey: prev.periodKey,
      format: prev.format,
      autoName: prev.autoName,
      customStart: prev.customStart,
      customEnd: prev.customEnd,
    }));
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete report',
      message: 'This report will be removed from recent reports. You can regenerate it later if needed.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep report',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((report) => report.id !== id));
      setSelectedId((current) => (current === id ? null : current));
      showToast({ message: 'Report deleted' });
    } catch (error) {
      const message = error.message || 'Failed to delete report';
      showToast({ message, type: 'error' });
    }
  };

  const handleDownload = () => {
    if (!selected) return;
    try {
      if (selected.format === 'CSV') {
        exportReportAsCSV(selected);
      } else if (selected.format === 'XLSX') {
        exportReportAsXLSX(selected);
      } else {
        exportReportAsPDF(selected);
      }
    } catch (error) {
      const message = error.message || 'Unable to download report';
      showToast({ message, type: 'error' });
    }
  };

  const handlePrint = () => {
    if (!selected) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(buildPrintableHtml(selected));
    w.document.close();
  };

  const activePeriodRange = selected
    ? formatRangeLabel(selected.startDate, selected.endDate)
    : null;

  return (
    <div className="reports-page">
      <div className="set-head">
        <h2 className="set-title">Financial Reports</h2>
        <p className="set-sub">Generate, filter, and export detailed financial statements.</p>
      </div>

      <div className="grid">
        <div className="col">
          <div className="panel">
            <h4 className="panel-title">Generate Report</h4>
            <form className="report-form" onSubmit={handleGenerate}>
              <label className="set-field">
                <span className="set-label">
                  Report Name
                  <span className="help-icon" title="This title appears on the preview and export files.">?</span>
                </span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  placeholder={makeReportName(form.type, getPeriodLabel(form.periodKey, form.customStart, form.customEnd))}
                  onChange={handleFormChange}
                />
                <div className="form-helper">
                  Helpful to describe the audience or goal.
                  <button
                    type="button"
                    className="link-button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        name: makeReportName(prev.type, getPeriodLabel(prev.periodKey, prev.customStart, prev.customEnd)),
                        autoName: true,
                      }))
                    }
                  >
                    Auto-fill from selection
                  </button>
                </div>
                <label className="inline-helper">
                  <input
                    type="checkbox"
                    checked={form.autoName}
                    onChange={handleAutoNameToggle}
                  />
                  Keep name in sync with type and period
                </label>
              </label>

              <label className="set-field">
                <span className="set-label">
                  Report Type
                  <span className="help-icon" title="Pick the view you want to analyze.">?</span>
                </span>
                <select name="type" value={form.type} onChange={handleFormChange}>
                  {REPORT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.value}
                    </option>
                  ))}
                </select>
                <div className="form-helper">{selectedType?.description}</div>
              </label>

              <label className="set-field">
                <span className="set-label">
                  Period
                  <span className="help-icon" title="Choose a pre-set period or your own dates.">?</span>
                </span>
                <select name="periodKey" value={form.periodKey} onChange={handleFormChange}>
                  {PERIODS.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
                <div className="form-helper">{selectedPeriod?.description}</div>
              </label>

              {form.periodKey === 'custom' && (
                <div className="custom-range">
                  <label>
                    <span className="set-label">Starts</span>
                    <input
                      type="date"
                      name="customStart"
                      value={form.customStart}
                      onChange={handleFormChange}
                    />
                  </label>
                  <label>
                    <span className="set-label">Ends</span>
                    <input
                      type="date"
                      name="customEnd"
                      value={form.customEnd}
                      onChange={handleFormChange}
                    />
                  </label>
                </div>
              )}

              <label className="set-field">
                <span className="set-label">
                  Format
                  <span className="help-icon" title="Choose the export format for the generated file.">?</span>
                </span>
                <select name="format" value={form.format} onChange={handleFormChange}>
                  {FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.value}
                    </option>
                  ))}
                </select>
                <div className="form-helper">{selectedFormat?.description}</div>
              </label>

              <label className="set-field">
                <span className="set-label">
                  Notes
                  <span className="help-icon" title="Add context or assumptions that should travel with the report.">?</span>
                </span>
                <textarea
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Optional context or reminders for whoever reviews this report."
                />
                <div className="form-helper">Notes appear alongside the preview and export.</div>
              </label>

              <div className="toolbar">
                <button type="button" className="btn ghost" onClick={handleReset} disabled={saving}>
                  Reset
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Generating…' : 'Generate Report'}
                </button>
              </div>
            </form>
          </div>

          <div className="panel">
            <h4 className="panel-title">Recent Reports</h4>

            <div className="filter-row">
              <input
                type="search"
                name="search"
                value={filters.search}
                placeholder="Search by name or type"
                onChange={handleFilterChange}
              />
              <select name="reportType" value={filters.reportType} onChange={handleFilterChange}>
                <option value="all">All types</option>
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.value}
                  </option>
                ))}
              </select>
              <select name="periodKey" value={filters.periodKey} onChange={handleFilterChange}>
                <option value="all">All periods</option>
                {PERIODS.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.label}
                  </option>
                ))}
              </select>
              <select name="format" value={filters.format} onChange={handleFilterChange}>
                <option value="all">All formats</option>
                {FORMATS.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-row condensed">
              <label>
                <span className="set-label">Start</span>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                />
              </label>
              <label>
                <span className="set-label">End</span>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                />
              </label>
              <button type="button" className="btn ghost" onClick={clearFilters}>
                Clear filters
              </button>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Period</th>
                    <th>Generated</th>
                    <th>Format</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="empty">
                        Loading reports…
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr
                        key={report.id}
                        className={selectedId === report.id ? 'active' : ''}
                        onClick={() => setSelectedId(report.id)}
                      >
                        <td>
                          <div className="table-primary">{report.name}</div>
                          <div className="table-sub">
                            #{typeof report.id === 'string' ? report.id.slice(-6) : '——'}
                          </div>
                        </td>
                        <td>{report.reportType}</td>
                        <td>
                          <div className="table-primary">{report.period || getPeriodLabel(report.periodKey, report.startDate, report.endDate)}</div>
                          <div className="table-sub">{formatRangeLabel(report.startDate, report.endDate)}</div>
                        </td>
                        <td>{formatDateTime(report.generatedAt)}</td>
                        <td>{report.format || 'PDF'}</td>
                        <td>
                          <button
                            type="button"
                            className="link"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(report.id);
                            }}
                          >
                            Preview
                          </button>
                          <span className="sep">·</span>
                          <button
                            type="button"
                            className="link danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(report.id);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                  {!loading && reports.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty">
                        No results.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="panel preview-panel">
            <div className="preview-head">
              <h4 className="panel-title">Report Preview</h4>
              <div className="actions">
                <button className="btn ghost" onClick={handlePrint} disabled={!selected}>
                  Print
                </button>
                <button className="btn primary" onClick={handleDownload} disabled={!selected}>
                  Download
                </button>
              </div>
            </div>

            {!selected || !previewPayload ? (
              <div className="preview-empty">
                <div className="preview-icon" aria-hidden>📄</div>
                <div className="preview-text">Select a report to preview</div>
                <div className="preview-sub">Generated reports will appear here before downloading</div>
              </div>
            ) : (
              <div className="preview-body">
                <h3 className="preview-title">{previewPayload.title}</h3>
                <div className="preview-meta">
                  <span>{previewPayload.subtitle || selected.periodLabel}</span>
                  {activePeriodRange ? <span className="dot">•</span> : null}
                  {activePeriodRange ? <span>{activePeriodRange}</span> : null}
                  {previewPayload.generatedAt ? (
                    <>
                      <span className="dot">•</span>
                      <span>Generated {formatDateTime(previewPayload.generatedAt)}</span>
                    </>
                  ) : null}
                </div>

                {previewPayload.notes ? (
                  <div className="preview-notes">
                    <strong>Notes:</strong> {previewPayload.notes}
                  </div>
                ) : null}

                {(previewPayload.sections || []).length === 0 ? (
                  <div className="preview-empty-section">No sections available for this report.</div>
                ) : (
                  previewPayload.sections.map((section, index) => {
                    if (section.type === 'metrics') {
                      return (
                        <div key={index} className="preview-section metrics">
                          <div className="section-head">
                            <h5>{section.title || 'Metrics'}</h5>
                          </div>
                          <div className="metrics-grid">
                            {(section.items || []).map((item, idx) => (
                              <div key={idx} className={`metric-card ${item.kind || ''}`}>
                                <div className="metric-label">{item.label}</div>
                                <div className="metric-value">{formatMetricValue(item.value, item.format)}</div>
                                {typeof item.delta === 'number' && Number.isFinite(item.delta) ? (
                                  <div className={`metric-delta ${item.delta < 0 ? 'down' : item.delta > 0 ? 'up' : ''}`}>
                                    {formatDelta(item.delta)}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (section.type === 'table') {
                      const hasRows = (section.rows || []).length > 0;
                      return (
                        <div key={index} className="preview-section table">
                          <div className="section-head">
                            <h5>{section.title || 'Details'}</h5>
                            {section.description ? <span className="section-sub">{section.description}</span> : null}
                          </div>
                          {hasRows ? (
                            <div className="section-table-wrap">
                              <table className="section-table">
                                {section.headers && section.headers.length ? (
                                  <thead>
                                    <tr>
                                      {section.headers.map((header) => (
                                        <th key={header}>{header}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                ) : null}
                                <tbody>
                                  {section.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                      {(row.cells || []).map((cell, cellIndex) => (
                                        <td key={cellIndex}>
                                          {formatMetricValue(cell, (row.formats || [])[cellIndex])}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                                {section.footer ? (
                                  <tfoot>
                                    <tr>
                                      <td colSpan={Math.max(section.headers?.length || 1, 1)}>
                                        <strong>{section.footer.label || 'Total'}:</strong>{' '}
                                        {formatMetricValue(section.footer.value, section.footer.format)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                ) : null}
                              </table>
                            </div>
                          ) : (
                            <div className="preview-empty-section">
                              {section.emptyMessage || 'No data available for this section.'}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (section.type === 'text') {
                      return (
                        <div key={index} className="preview-section text">
                          <div className="section-head">
                            <h5>{section.title || 'Notes'}</h5>
                          </div>
                          <p>{section.body}</p>
                        </div>
                      );
                    }

                    return null;
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
