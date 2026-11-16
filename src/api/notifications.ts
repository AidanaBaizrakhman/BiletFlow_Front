import type { Role } from '../types';
import { call } from './client';
import { commit, db } from './mockDb';

/** GET /api/v1/notifications */
export function listNotifications(role: Role) {
  return call('GET', '/api/v1/notifications', () =>
    db.notifications.filter((n) => n.audience === role).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
}

/** POST /api/v1/notifications/:id/read */
export function markNotificationRead(id: string) {
  return call('POST', `/api/v1/notifications/${id}/read`, () => {
    const n = db.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    commit();
    return { ok: true };
  });
}

/** POST /api/v1/notifications/read-all */
export function markAllNotificationsRead(role: Role) {
  return call('POST', '/api/v1/notifications/read-all', () => {
    db.notifications.filter((n) => n.audience === role).forEach((n) => (n.read = true));
    commit();
    return { ok: true };
  });
}
