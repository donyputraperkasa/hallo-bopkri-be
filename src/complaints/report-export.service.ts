import { Injectable } from '@nestjs/common';
import { Complaint } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

type ExportRow = Pick<
  Complaint,
  | 'ticketCode'
  | 'category'
  | 'reporterName'
  | 'contact'
  | 'content'
  | 'createdAt'
  | 'updatedAt'
> & {
  status: { code: string; name: string };
};

@Injectable()
export class ReportExportService {
  async toExcel(rows: ExportRow[]) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Laporan Aduan');
    sheet.columns = [
      { header: 'Kode Tiket', key: 'ticketCode', width: 36 },
      { header: 'Tanggal', key: 'createdAt', width: 22 },
      { header: 'Kategori', key: 'category', width: 18 },
      { header: 'Nama', key: 'reporterName', width: 24 },
      { header: 'Kontak', key: 'contact', width: 26 },
      { header: 'Isi Aduan', key: 'content', width: 60 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Diperbarui', key: 'updatedAt', width: 22 },
    ];
    rows.forEach((row) =>
      sheet.addRow({
        ...row,
        status: row.status.name,
      }),
    );
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF087F8C' },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'H1' };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  toPdf(rows: ExportRow[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      document.fontSize(18).text('Laporan Aduan Hallo BOPKRI');
      document
        .fontSize(9)
        .fillColor('#555555')
        .text(`Dibuat: ${new Date().toLocaleString('id-ID')}`)
        .moveDown();

      rows.forEach((row, index) => {
        if (document.y > 700) document.addPage();
        document
          .fillColor('#000000')
          .fontSize(11)
          .text(`${index + 1}. ${row.ticketCode} — ${row.status.name}`, {
            continued: false,
          })
          .fontSize(9)
          .text(`${row.createdAt.toLocaleString('id-ID')} | ${row.category}`)
          .text(
            `Pelapor: ${row.reporterName ?? 'Anonim'} | ${row.contact ?? '-'}`,
          )
          .text(row.content, { width: 510 })
          .moveDown();
      });
      document.end();
    });
  }
}
