import { EventEmitter } from 'events';

class NotificationService extends EventEmitter {}

const notificationEmitter = new NotificationService();

// Listener básico para registrar logs en consola (Requisito T2 de la práctica)
notificationEmitter.on('user:registered', (payload) => {
    console.log(`[EVENT] user:registered -> email: ${payload.email}`);
});

notificationEmitter.on('user:verified', (payload) => {
    console.log(`[EVENT] user:verified -> id: ${payload.id}`);
});

notificationEmitter.on('user:invited', (payload) => {
    console.log(`[EVENT] user:invited -> invitado: ${payload.guestEmail} por la empresa: ${payload.companyId}`);
});

notificationEmitter.on('user:deleted', (payload) => {
    console.log(`[EVENT] user:deleted -> id: ${payload.id}`);
});

export default notificationEmitter;
