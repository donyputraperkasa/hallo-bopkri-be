import { ReportExportService } from './report-export.service';

describe('ReportExportService', () => {
  const service = new ReportExportService();

  it('creates an Excel workbook', async () => {
    const result = await service.toExcel([]);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(1000);
  });

  it('creates a PDF report', async () => {
    const result = await service.toPdf([]);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.subarray(0, 4).toString()).toBe('%PDF');
  });
});
