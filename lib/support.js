import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { DATA_DIR } from './jobIndex';

const TICKETS_PATH = path.join(DATA_DIR, 'support.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getAllTickets() {
  if (!fs.existsSync(TICKETS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(TICKETS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAllTickets(tickets) {
  ensureDataDir();
  fs.writeFileSync(TICKETS_PATH, JSON.stringify(tickets, null, 2));
}

export function addTicket({ name, email, category, message, userId }) {
  const tickets = getAllTickets();
  const ticket = {
    id: uuid(),
    name,
    email,
    category,
    message,
    userId: userId || null,
    status: 'aberto', // aberto | resolvido
    createdAt: new Date().toISOString(),
  };
  tickets.unshift(ticket); // mais recente primeiro
  saveAllTickets(tickets);
  return ticket;
}

export function setTicketStatus(ticketId, status) {
  const tickets = getAllTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  ticket.status = status;
  saveAllTickets(tickets);
  return ticket;
}
