import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Complaint } from '@prisma/client';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly mailer?: Transporter;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST')?.trim();
    if (host && !host.includes('example.com')) {
      this.mailer = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT', 587),
        secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: config.get<string>('SMTP_USER'),
          pass: config.get<string>('SMTP_PASSWORD'),
        },
      });
    }
  }

  async notifyNewComplaint(complaint: Complaint) {
    const message = [
      'Ada aduan baru yang masuk.',
      `Tiket: ${complaint.ticketCode}`,
      `Kategori: ${complaint.category}`,
      `Isi: ${complaint.content.slice(0, 500)}`,
    ].join('\n');

    await Promise.allSettled([
      this.sendEmail(
        this.config.get<string>('ADMIN_NOTIFICATION_EMAIL'),
        `[Hallo BOPKRI] Aduan baru ${complaint.ticketCode}`,
        message,
      ),
      this.sendWhatsApp(
        this.config.get<string>('ADMIN_NOTIFICATION_WHATSAPP'),
        message,
      ),
    ]);
  }

  async notifyStatusChanged(
    complaint: Complaint,
    statusName: string,
    publicNote?: string,
  ) {
    if (!complaint.contact) return;
    const message = [
      `Progres aduan ${complaint.ticketCode}: ${statusName}.`,
      publicNote?.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    if (complaint.contact.includes('@')) {
      await this.sendEmail(
        complaint.contact,
        `[Hallo BOPKRI] Progres ${complaint.ticketCode}`,
        message,
      );
    } else {
      await this.sendWhatsApp(complaint.contact, message);
    }
  }

  private async sendEmail(
    to: string | undefined,
    subject: string,
    text: string,
  ) {
    if (!to || !this.mailer || to.includes('example.com')) return;
    try {
      await this.mailer.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'Hallo BOPKRI'),
        to,
        subject,
        text,
      });
    } catch (error) {
      this.logger.warn(`Notifikasi email gagal: ${this.errorMessage(error)}`);
    }
  }

  private async sendWhatsApp(to: string | undefined, message: string) {
    const url = this.config.get<string>('WHATSAPP_GATEWAY_URL')?.trim();
    if (!to || !url || url.includes('example.com')) return;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.get<string>('WHATSAPP_GATEWAY_TOKEN', '')}`,
        },
        body: JSON.stringify({ target: to, message }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(
        `Notifikasi WhatsApp gagal: ${this.errorMessage(error)}`,
      );
    }
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
