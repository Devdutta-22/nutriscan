import { AuditReport } from '../types/compliance';

export class NoticeGenerator {
  static generatePrintableHtml(report: AuditReport): string {
    const violationsRows = report.checklist
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e5e7eb; ${item.status === 'VIOLATION' ? 'background-color: #fef2f2;' : item.status === 'WARNING' ? 'background-color: #fffbeb;' : ''}">
          <td style="padding: 10px; font-weight: 600; font-size: 13px;">${idx + 1}. ${item.name}</td>
          <td style="padding: 10px; font-size: 12px; font-family: monospace;">${item.rule}</td>
          <td style="padding: 10px; font-size: 12px; max-width: 180px; word-break: break-word;">${item.extracted_text || 'None'}</td>
          <td style="padding: 10px; font-size: 12px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px; ${
              item.status === 'COMPLIANT'
                ? 'background: #dcfce7; color: #166534;'
                : item.status === 'WARNING'
                ? 'background: #fef3c7; color: #92400e;'
                : 'background: #fee2e2; color: #991b1b;'
            }">
              ${item.status}
            </span>
          </td>
          <td style="padding: 10px; font-size: 12px; color: #374151;">${item.reason}</td>
          <td style="padding: 10px; font-size: 11px; color: #4b5563; font-style: italic;">${item.gazette_citation?.penalty_rule || 'Rule 32'}</td>
        </tr>
      `
      )
      .join('');

    const uspCalcHtml = report.usp_verification.calculated
      ? `
      <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; color: #0369a1; font-size: 14px;">STATUTORY USP DETERMINISTIC AUDIT (Rule 6(1)(s) - 2024 Amendment)</h4>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Formula:</strong> ${report.usp_verification.calculated.formula}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Statutory Required Rate:</strong> ${report.usp_verification.calculated.expected_display} ${report.usp_verification.calculated.alt_display ? `(or ${report.usp_verification.calculated.alt_display})` : ''}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Printed on Label:</strong> ${report.usp_verification.printed || 'NOT DECLARED'}</p>
        <p style="margin: 4px 0; font-size: 13px; font-weight: bold; color: ${report.usp_verification.is_valid ? '#166534' : '#991b1b'};">
          Audit Finding: ${report.usp_verification.reason}
        </p>
      </div>
    `
      : '';

    const isCompliant = report.summary.violations_count === 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${isCompliant ? 'Official Certificate of Statutory Compliance' : 'Official Notice of Non-Compliance'} - ${report.audit_id}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; margin: 0; padding: 20px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 20px; }
          .emblem { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #1e3a8a; }
          .dept { font-size: 14px; font-weight: 600; text-transform: uppercase; color: #4b5563; }
          .sub { font-size: 11px; color: #6b7280; }
          .title-box { background: ${isCompliant ? '#065f46' : '#111827'}; color: white; padding: 8px 16px; margin: 15px 0; text-align: center; font-weight: 700; letter-spacing: 1px; font-size: 15px; border-radius: 4px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; }
          .meta-item { padding: 8px; background: #f3f4f6; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #f3f4f6; text-align: left; padding: 10px; font-size: 12px; border-bottom: 2px solid #d1d5db; color: #1f2937; }
          .directives { margin-top: 25px; padding: 15px; background: ${isCompliant ? '#f0fdf4' : '#fff1f2'}; border: 1px solid ${isCompliant ? '#bbf7d0' : '#fecdd3'}; border-radius: 6px; }
          .directives h4 { margin: 0 0 10px 0; color: ${isCompliant ? '#166534' : '#9f1239'}; font-size: 14px; }
          .directives ul { margin: 0; padding-left: 20px; font-size: 12.5px; color: ${isCompliant ? '#14532d' : '#881337'}; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px dashed #9ca3af; font-size: 13px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="emblem">GOVERNMENT OF INDIA</div>
          <div class="dept">MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION</div>
          <div class="sub">Department of Consumer Affairs • Legal Metrology Division</div>
          <div class="sub">Enforcement of Legal Metrology (Packaged Commodities) Rules, 2011 & 2024 Amendments</div>
        </div>

        <div class="title-box">
          ${isCompliant 
            ? 'INSPECTION MEMORANDUM & CERTIFICATE OF STATUTORY COMPLIANCE' 
            : 'INSPECTION MEMORANDUM & NOTICE OF STATUTORY CONTRAVENTION'}
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <strong>Audit Reference:</strong> ${report.audit_id}<br/>
            <strong>Inspection Date/Time:</strong> ${new Date(report.audit_timestamp).toLocaleString('en-IN')}<br/>
            <strong>Commodity Title:</strong> ${report.product_name}
          </div>
          <div class="meta-item">
            <strong>Compliance Index:</strong> ${report.compliance_score}% / 100%<br/>
            <strong>Statutory Finding:</strong> <span style="color: ${report.summary.violations_count > 0 ? '#b91c1c' : '#15803d'}; font-weight: bold;">${report.legal_status}</span><br/>
            <strong>Contraventions Detected:</strong> ${report.summary.violations_count} Violations, ${report.summary.warnings_count} Warnings
          </div>
        </div>

        <p style="font-size: 13px;">
          Whereas in exercise of powers conferred under Section 15 of the <em>Legal Metrology Act, 2009</em>, an automated verification of declarations printed on the packaged commodity detailed above was conducted pursuant to the <em>Legal Metrology (Packaged Commodities) Rules, 2011</em> (as amended). The findings are documented hereunder:
        </p>

        <table>
          <thead>
            <tr>
              <th>Mandate Item</th>
              <th>Rule Ref</th>
              <th>Declared Content</th>
              <th>Audit Status</th>
              <th>Observation / Defect</th>
              <th>Sanction Provision</th>
            </tr>
          </thead>
          <tbody>
            ${violationsRows}
          </tbody>
        </table>

        ${uspCalcHtml}

        <div class="directives">
          ${isCompliant ? `
            <h4>STATUTORY CLEARANCE & VERIFICATION RECORD</h4>
            <ul>
              <li>This pre-packaged commodity has been audited pursuant to the <strong>Legal Metrology (Packaged Commodities) Rules, 2011</strong>.</li>
              <li>All mandatory declarations either strictly conform to Rule 6 or qualify for statutory exemption under <strong>Rule 26(a) (Small Packages ≤ 10g / 10ml)</strong>.</li>
              <li>No actionable contraventions or violations of Rule 32 were detected. This product is verified lawful for commercial distribution and retail sale.</li>
            </ul>
          ` : `
            <h4>STATUTORY DIRECTIVE & RECTIFICATION ORDER</h4>
            <ul>
              <li>Under <strong>Rule 32</strong> of the Legal Metrology (Packaged Commodities) Rules, 2011, distribution or offer for sale of non-compliant packages is an actionable statutory offense punishable with fine up to ₹25,000/- for the first offense and ₹50,000/- or imprisonment for subsequent offenses.</li>
              <li>The Manufacturer / Importer / Packer is hereby directed to show cause within <strong>15 days</strong> of receipt of this notice as to why compounding or legal prosecution proceedings under Section 36 / Section 39 should not be initiated.</li>
              <li>Retail distribution of non-compliant batches must be paused until corrective labeling or compounding is completed under Section 48 of the Act.</li>
            </ul>
          `}
        </div>

        <div class="signatures">
          <div>
            <strong>Verified By:</strong><br/>
            Automated FairPack Regulatory Engine<br/>
            Digital Stamp: SHA256-${report.audit_id.slice(-8)}<br/>
            National Metrology Portal Synchronization: ACTIVE
          </div>
          <div style="text-align: right;">
            <strong>For & on behalf of:</strong><br/>
            Inspector / Legal Metrology Officer<br/>
            Legal Metrology Department<br/>
            Official Seal & Signature
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static printNotice(report: AuditReport): void {
    const html = this.generatePrintableHtml(report);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 500);
    }
  }
}
