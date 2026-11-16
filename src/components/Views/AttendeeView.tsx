import React, { useEffect, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import "flatpickr/dist/flatpickr.css";
import type { EventFormData } from '../../types';
import { createGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendar';

interface AttendeeViewProps {
  events: EventFormData[];
  onSelectEvent: (event: EventFormData) => void;
}

export const AttendeeView: React.FC<AttendeeViewProps> = ({ events, onSelectEvent }) => {
  const [todayDateStr, setTodayDateStr] = useState('');

  useEffect(() => {
    const today = new Date();
    setTodayDateStr(today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }));
  }, []);

  const renderEventBox = (event: EventFormData, index: number) => {
    const isPaid = event.tickets.some((t) => t.type === 'Paid' && t.price > 0);
    const googleCalUrl = createGoogleCalendarUrl(
      event.title,
      event.description,
      event.venue,
      event.eventDate
    );

    return (
      <div className="event-box" key={event.id || index} style={{ height: 'auto', minHeight: '210px' }}>
        <div>
          <div className="event-name">{event.title}</div>
          <div className="event-desc">
            {isPaid ? 'Paid Event' : 'Free Event'} • {event.category}
            <br />
            <small>{event.eventDate || 'Date pending'} @ {event.venue}</small>
          </div>
        </div>

        {/* Task F7.4: Add to Calendar Buttons */}
        <div style={{ margin: '10px 0', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sm-btn"
            style={{ textDecoration: 'none', fontSize: '11px', padding: '3px 6px' }}
          >
            + Google Cal
          </a>
          <button
            type="button"
            className="sm-btn"
            style={{ fontSize: '11px', padding: '3px 6px' }}
            onClick={() => downloadIcsFile(event.title, event.description, event.venue, event.eventDate)}
          >
            Download .ics
          </button>
        </div>

        <button className="action-btn" onClick={() => onSelectEvent(event)}>
          {isPaid ? 'Buy Ticket' : 'Register Free'}
        </button>
      </div>
    );
  };

  return (
    <div id="attendeeView" className="role-view active-view">
      <section className="date-filters">
        <button className="date-btn" id="todayBtn">
          <span className="btn-title">Today</span>
          <span className="btn-sub">{todayDateStr || 'Loading...'}</span>
        </button>

        <div className="calendar-wrapper">
          <Flatpickr
            className="text-input"
            options={{ mode: 'range', dateFormat: 'Y-m-d' }}
            placeholder="Choose the time period"
          />
        </div>
      </section>

      {events.length === 0 ? (
        <div className="empty-events-state">
          <h3>No events available for registration yet</h3>
          <p>Organizers have not published any events. Please check back later!</p>
        </div>
      ) : (
        <>
          <section className="tape-section">
            <h3>Featured Events</h3>
            <div className="tape-container">
              {events.map((evt, idx) => renderEventBox(evt, idx))}
            </div>
          </section>

          <section className="events-grid-section">
            <h3>All Events</h3>
            <div className="events-grid">
              {events.map((evt, idx) => renderEventBox(evt, idx))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};