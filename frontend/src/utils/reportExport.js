import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const sanitizeSheetName = (value, fallback) => {
  const base = (value || fallback || 'Sheet').replace(/[/\\?*[\]]/g, '').substring(0, 28);
  return base || 'Sheet';
};

const sanitizeFilename = (value) => {
  const trimmed = (value || 'report').trim();
  return trimmed.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').toLowerCase() || 'report';
};

const formatNumericValue = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return value ?? '';
  }
  return numberFormatter.format(value);
};

const formatPercentageValue = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return value ?? '';
  }
  return `${percentageFormatter.format(value)}%`.replace('%%', '%');
};

const formatValue = (value, format) => {
  if (format === 'percentage') {
    return formatPercentageValue(value);
  }
  return formatNumericValue(value);
};

export const normalizeReportPayload = (payload, fallback = {}) => {
  if (payload && Array.isArray(payload.sections)) {
    return payload;
  }

  if (payload && Array.isArray(payload.lines)) {
    return {
      title: payload.title || fallback.reportType || 'Financial Report',
      subtitle: payload.period || payload.subtitle || fallback.period || '',
      generatedAt: payload.generatedAt || fallback.generatedAt || new Date().toISOString(),
      sections: [
        {
          type: 'table',
          title: 'Details',
          headers: ['Label', 'Value'],
          rows: payload.lines.map((entry) => ({
            cells: [entry.label, entry.value],
          })),
        },
      ],
    };
  }

  return {
    title: fallback.title || fallback.reportType || 'Financial Report',
    subtitle: fallback.period || '',
    generatedAt: fallback.generatedAt || new Date().toISOString(),
    sections: [],
  };
};

const buildCsvContent = (report) => {
  const lines = [];
  const payload = normalizeReportPayload(report.payload, report);

  lines.push([payload.title]);
  if (payload.subtitle) {
    lines.push([payload.subtitle]);
  }
  if (payload.generatedAt) {
    lines.push([`Generated: ${new Date(payload.generatedAt).toLocaleString()}`]);
  }
  lines.push([]);

  payload.sections.forEach((section) => {
    lines.push([section.title || 'Section']);
    if (section.type === 'metrics') {
      lines.push(['Metric', 'Value', 'Delta']);
      (section.items || []).forEach((item) => {
        lines.push([
          item.label || '',
          formatValue(item.value, item.format),
          typeof item.delta === 'number' && Number.isFinite(item.delta) ? formatPercentageValue(item.delta) : '',
        ]);
      });
    } else if (section.type === 'table') {
      lines.push(section.headers || []);
      (section.rows || []).forEach((row) => {
        const cells = row.cells || [];
        const formats = row.formats || [];
        lines.push(
          cells.map((cell, index) => formatValue(cells[index], formats[index]))
        );
      });
      if (section.footer) {
        const footerLine = new Array((section.headers || []).length).fill('');
        footerLine[0] = section.footer.label || '';
        footerLine[footerLine.length - 1] = formatValue(section.footer.value, section.footer.format);
        lines.push(footerLine);
      }
    } else if (section.type === 'text') {
      lines.push([section.body || '']);
    }
    lines.push([]);
  });

  if (payload.notes) {
    lines.push(['Notes']);
    lines.push([payload.notes]);
  }

  return lines.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
};

export const exportReportAsCSV = (report) => {
  const csv = buildCsvContent(report);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const filename = `${sanitizeFilename(report.name || report.reportType)}.csv`;
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportReportAsXLSX = (report) => {
  const payload = normalizeReportPayload(report.payload, report);
  const workbook = XLSX.utils.book_new();

  payload.sections.forEach((section, index) => {
    const rows = [];
    rows.push([section.title || `Section ${index + 1}`]);
    if (section.type === 'metrics') {
      rows.push(['Metric', 'Value', 'Delta']);
      (section.items || []).forEach((item) => {
        rows.push([
          item.label || '',
          formatValue(item.value, item.format),
          typeof item.delta === 'number' && Number.isFinite(item.delta) ? formatPercentageValue(item.delta) : '',
        ]);
      });
    } else if (section.type === 'table') {
      if (section.headers && section.headers.length) {
        rows.push(section.headers);
      }
      (section.rows || []).forEach((row) => {
        const cells = row.cells || [];
        const formats = row.formats || [];
        rows.push(
          cells.map((cell, cellIndex) => formatValue(cell, formats[cellIndex]))
        );
      });
      if (section.footer) {
        const footerRow = new Array((section.headers || []).length).fill('');
        footerRow[0] = section.footer.label || '';
        footerRow[footerRow.length - 1] = formatValue(section.footer.value, section.footer.format);
        rows.push(footerRow);
      }
    } else if (section.type === 'text') {
      rows.push([section.body || '']);
    }
    rows.push([]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(section.title, `Section ${index + 1}`));
  });

  if (!payload.sections.length) {
    const worksheet = XLSX.utils.aoa_to_sheet([[payload.title || 'Report'], ['No data available']]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
  }

  const filename = `${sanitizeFilename(report.name || report.reportType)}.xlsx`;
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportReportAsPDF = (report) => {
  const payload = normalizeReportPayload(report.payload, report);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = margin;

  doc.setFontSize(18);
  doc.text(payload.title || 'Financial Report', margin, y);
  y += 22;

  doc.setFontSize(12);
  if (payload.subtitle) {
    doc.text(payload.subtitle, margin, y);
    y += 18;
  }

  if (payload.generatedAt) {
    doc.text(`Generated: ${new Date(payload.generatedAt).toLocaleString()}`, margin, y);
    y += 24;
  } else {
    y += 12;
  }

  payload.sections.forEach((section) => {
    doc.setFontSize(14);
    doc.text(section.title || 'Section', margin, y);
    y += 16;

    if (section.type === 'metrics') {
      doc.setFontSize(11);
      (section.items || []).forEach((item) => {
        const line = `${item.label || ''}: ${formatValue(item.value, item.format)}`;
        doc.text(line, margin, y);
        if (typeof item.delta === 'number' && Number.isFinite(item.delta)) {
          doc.text(`  Δ ${formatPercentageValue(item.delta)}`, margin, y + 14);
          y += 28;
        } else {
          y += 20;
        }
      });
    } else if (section.type === 'table') {
      const head = [];
      if (section.headers && section.headers.length) {
        head.push(section.headers);
      }
      const body = (section.rows || []).map((row) => {
        const cells = row.cells || [];
        const formats = row.formats || [];
        return cells.map((cell, idx) => formatValue(cell, formats[idx]));
      });

      autoTable(doc, {
        startY: y,
        head: head.length ? head : undefined,
        body,
        styles: { fontSize: 10 },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 16;

      if (section.footer) {
        doc.text(
          `${section.footer.label || 'Total'}: ${formatValue(section.footer.value, section.footer.format)}`,
          margin,
          y
        );
        y += 16;
      }
    } else if (section.type === 'text') {
      const text = doc.splitTextToSize(section.body || '', doc.internal.pageSize.getWidth() - margin * 2);
      doc.text(text, margin, y);
      y += text.length * 14 + 8;
    }

    y += 12;

    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  });

  if (payload.notes) {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(13);
    doc.text('Notes', margin, y);
    y += 16;
    const noteLines = doc.splitTextToSize(payload.notes, doc.internal.pageSize.getWidth() - margin * 2);
    doc.setFontSize(11);
    doc.text(noteLines, margin, y);
  }

  const filename = `${sanitizeFilename(report.name || report.reportType)}.pdf`;
  doc.save(filename);
};
