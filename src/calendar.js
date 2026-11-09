function escapeCalendarText(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function toCalendarDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function initCalendar(config) {
  const link = document.querySelector('[data-calendar]');
  const start = new Date(config.event.date);
  if (!config.event.date || Number.isNaN(start.getTime())) return;
  link.hidden = false;
  link.addEventListener('click', event => {
    event.preventDefault();
    const end = config.event.endDate ? new Date(config.event.endDate) : new Date(start.getTime() + 8 * 60 * 60 * 1000);
    const location = config.events.map(item => item.venue).filter(Boolean).join(' / ');
    const description = [config.event.dateLabel, ...config.events.map(item => `${item.time} ${item.title} — ${item.venue}`)].join('\n');
    const content = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Invitatii Digitale//RO', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:${config.clientId}-${toCalendarDate(start)}@invitatii-digitale`,
      `DTSTAMP:${toCalendarDate(new Date())}`, `DTSTART:${toCalendarDate(start)}`, `DTEND:${toCalendarDate(end)}`,
      `SUMMARY:${escapeCalendarText(`Nunta ${config.couple.firstNameA} & ${config.couple.firstNameB}`)}`,
      `DESCRIPTION:${escapeCalendarText(description)}`, `LOCATION:${escapeCalendarText(location)}`,
      'END:VEVENT', 'END:VCALENDAR', ''
    ].join('\r\n');
    const file = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const download = document.createElement('a');
    download.href = url;
    download.download = `${config.clientId}-nunta.ics`;
    document.body.append(download);
    download.click();
    download.remove();
    URL.revokeObjectURL(url);
  });
}
