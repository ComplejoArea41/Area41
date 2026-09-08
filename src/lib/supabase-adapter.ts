import { supabase } from '@/lib/supabase';

// Convertidor camelCase <-> snake_case bidireccional
export function toSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);

  const newObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Si es un Timestamp de Firestore o Date
    let val = value;
    if (val && typeof val === 'object' && 'toDate' in val && typeof (val as any).toDate === 'function') {
      val = (val as any).toDate().toISOString();
    } else if (val instanceof Date) {
      val = val.toISOString();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      val = toSnakeCase(val);
    }

    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    newObj[snakeKey] = val;
  }
  return newObj;
}

export function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const newObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
    newObj[camelKey] = value;
    // Dejar también la propiedad original para compatibilidad total
    if (camelKey !== key) {
      newObj[key] = value;
    }
  }

  // Compatibilidad específica para campos comunes
  if (newObj.court_type && !newObj.courtType) newObj.courtType = newObj.court_type;
  if (newObj.court_number !== undefined && newObj.courtNumber === undefined) newObj.courtNumber = newObj.court_number;
  if (newObj.is_available !== undefined && newObj.isAvailable === undefined) newObj.isAvailable = newObj.is_available;
  if (newObj.is_active !== undefined && newObj.isActive === undefined) newObj.isActive = newObj.is_active;
  if (newObj.client_name && !newObj.clientName) newObj.clientName = newObj.client_name;
  if (newObj.phone_number && !newObj.phoneNumber) newObj.phoneNumber = newObj.phone_number;
  if (newObj.customer_name && !newObj.customerName) newObj.customerName = newObj.customer_name;
  if (newObj.customer_phone && !newObj.customerPhone) newObj.customerPhone = newObj.customer_phone;
  if (newObj.court_id && !newObj.courtId) newObj.courtId = newObj.court_id;
  if (newObj.court_ids && !newObj.courtIds) newObj.courtIds = newObj.court_ids;
  if (newObj.day_of_week !== undefined && newObj.dayOfWeek === undefined) newObj.dayOfWeek = newObj.day_of_week;
  if (newObj.image_url && !newObj.imageUrl) newObj.imageUrl = newObj.image_url;
  if (newObj.is_admin !== undefined && newObj.isAdmin === undefined) newObj.isAdmin = newObj.is_admin;
  if (newObj.first_name && !newObj.firstName) newObj.firstName = newObj.first_name;
  if (newObj.last_name && !newObj.lastName) newObj.lastName = newObj.last_name;
  
  // Soporte para reservationDateTime como objeto compatible con toDate() o Date
  if (newObj.reservation_date_time) {
    const d = new Date(newObj.reservation_date_time);
    newObj.reservationDateTime = {
      toDate: () => d,
      seconds: Math.floor(d.getTime() / 1000),
    };
  }

  return newObj;
}

export function extractTableAndId(pathOrRef: any): { table: string; id?: string } {
  if (!pathOrRef) return { table: '' };
  
  let p = '';
  if (typeof pathOrRef === 'string') {
    p = pathOrRef;
  } else if (pathOrRef.path) {
    p = pathOrRef.path;
  } else if (pathOrRef._query?.path?.canonicalString) {
    p = pathOrRef._query.path.canonicalString();
  }

  const parts = p.split('/').filter(Boolean);
  const table = parts[0] || '';
  const id = parts[1] || undefined;
  return { table, id };
}
