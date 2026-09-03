import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte de forma segura cualquier valor de fecha de Firestore (Timestamp, Date o string)
 * a un objeto Date de JavaScript. Si falla, devuelve la fecha actual para evitar crashes.
 */
export function safeToDate(dateValue: any): Date {
  if (!dateValue) return new Date();
  
  // Si ya es un Date
  if (dateValue instanceof Date) return dateValue;
  
  // Si es un Timestamp de Firebase
  if (typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  
  // Si es un objeto con segundos (formato interno de Timestamp)
  if (dateValue.seconds !== undefined) {
    return new Timestamp(dateValue.seconds, dateValue.nanoseconds || 0).toDate();
  }
  
  // Si es un string o número
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) return parsed;
  
  return new Date();
}
