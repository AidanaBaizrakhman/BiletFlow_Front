import { toDate } from './format';

/** Event times are Kazakhstan wall-clock (UTC+5); toDate() pins naive values to that zone. */
const startOf = (dateStr: string) => {
  const d = dateStr ? toDate(dateStr) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
};

export const createGoogleCalendarUrl = (title: string, description: string, venue: string, dateStr: string) => {
  const startDate = startOf(dateStr);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Event',
    details: description || '',
    location: venue || '',
    dates: dates,
    ctz: 'Asia/Almaty',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/** RFC 5545 text escaping (newlines, commas, semicolons, backslashes) */
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

export const downloadIcsFile = (title: string, description: string, venue: string, dateStr: string) => {
  const startDate = startOf(dateStr);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const formatIcsDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '').split('.')[0];

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BiletFlow//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${startDate.getTime()}-${(title || 'event').replace(/\W+/g, '').slice(0, 20)}@biletflow.kz`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `SUMMARY:${icsText(title || 'Event')}`,
    `DESCRIPTION:${icsText(description || '')}`,
    `LOCATION:${icsText(venue || '')}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${(title || 'event').replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
