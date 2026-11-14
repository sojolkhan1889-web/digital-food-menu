import { supabase } from '../lib/supabaseClient';

const generatePublicId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'pub_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const demoDates = [0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19];

export const supabaseTableRepository = {
  /**
   * List all non-deleted tables for the given restaurant tenant.
   * Auto-seeds 24 tables (with Table 04 & 13 inactive) if restaurant has no tables yet.
   */
  async list({ restaurantId = 'resto_001' }) {
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
        .order('table_no', { ascending: true });

      if (error) {
        console.warn('Supabase list tables warning:', error.message);
      }

      if (data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          restaurantId: row.restaurant_id,
          tableNo: row.table_no || Number(String(row.table_number || '').replace(/\D/g, '')) || 1,
          publicId: row.public_id || row.id,
          createdAt: row.created_at,
          active: row.is_active !== false && row.status !== 'inactive'
        })).sort((a, b) => a.tableNo - b.tableNo);
      }

      // Initial seed if table count is 0
      const initialSeed = Array.from({ length: 24 }, (_, i) => {
        const tableNo = i + 1;
        const pad3 = String(tableNo).padStart(3, '0');
        const pad2 = String(tableNo).padStart(2, '0');
        const publicId = generatePublicId();
        const active = tableNo !== 4 && tableNo !== 13;
        return {
          id: `tbl_${restaurantId}_${pad3}`,
          restaurant_id: restaurantId,
          table_id: `TBL-${pad3}`,
          table_number: `Table ${pad2}`,
          table_no: tableNo,
          public_id: publicId,
          is_active: active,
          status: active ? 'active' : 'inactive',
          created_at: daysAgo(demoDates[i] || 0),
          updated_at: new Date().toISOString()
        };
      });

      await supabase.from('restaurant_tables').upsert(initialSeed);

      return initialSeed.map((row) => ({
        id: row.id,
        restaurantId: row.restaurant_id,
        tableNo: row.table_no,
        publicId: row.public_id,
        createdAt: row.created_at,
        active: row.is_active
      }));
    } catch (err) {
      console.error('supabaseTableRepository.list exception:', err);
      return [];
    }
  },

  /**
   * Securely create the next sequential table number and immutable public UUID.
   */
  async create({ restaurantId = 'resto_001' }) {
    // 1. Get current maximum table number for this restaurant
    const { data: existing, error: queryErr } = await supabase
      .from('restaurant_tables')
      .select('table_no')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .order('table_no', { ascending: false })
      .limit(1);

    if (queryErr) {
      console.warn('Error reading max table number:', queryErr);
    }

    const nextNo = (existing && existing.length > 0 && existing[0]?.table_no ? existing[0].table_no : 0) + 1;
    const publicId = generatePublicId();
    const pad3 = String(nextNo).padStart(3, '0');
    const pad2 = String(nextNo).padStart(2, '0');

    const newRecord = {
      id: `tbl_${restaurantId}_${pad3}_${Date.now().toString(36)}`,
      restaurant_id: restaurantId,
      table_id: `TBL-${pad3}`,
      table_number: `Table ${pad2}`,
      table_no: nextNo,
      public_id: publicId,
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: insertErr } = await supabase.from('restaurant_tables').insert([newRecord]);
    if (insertErr) {
      console.error('Supabase create table error:', insertErr);
      throw new Error(insertErr.message || 'Failed to create table in database.');
    }

    return {
      id: newRecord.id,
      restaurantId,
      tableNo: nextNo,
      publicId,
      createdAt: newRecord.created_at,
      active: true
    };
  },

  /**
   * Update the displayed table number (the permanent publicId remains unchanged).
   */
  async rename({ restaurantId = 'resto_001', tableId, tableNo }) {
    const num = Number(tableNo);
    if (!Number.isSafeInteger(num) || num < 1 || num > 99999) {
      throw new Error('Enter a valid table number (1–99999).');
    }

    // Check for duplicate table number within the same restaurant
    const { data: dups } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('table_no', num)
      .neq('id', tableId)
      .is('deleted_at', null);

    if (dups && dups.length > 0) {
      throw new Error('That table number already exists for this restaurant.');
    }

    const pad3 = String(num).padStart(3, '0');
    const pad2 = String(num).padStart(2, '0');

    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({
        table_no: num,
        table_number: `Table ${pad2}`,
        table_id: `TBL-${pad3}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update table number.');
    }

    return {
      id: data.id,
      restaurantId: data.restaurant_id,
      tableNo: data.table_no,
      publicId: data.public_id,
      createdAt: data.created_at,
      active: data.is_active !== false && data.status !== 'inactive'
    };
  },

  /**
   * Activate or deactivate table QR access.
   */
  async setActive({ restaurantId = 'resto_001', tableId, active }) {
    const isActive = Boolean(active);
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({
        is_active: isActive,
        status: isActive ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update table status.');
    }

    return {
      id: data.id,
      restaurantId: data.restaurant_id,
      tableNo: data.table_no,
      publicId: data.public_id,
      createdAt: data.created_at,
      active: data.is_active
    };
  },

  /**
   * Soft-delete table to preserve historical order referential integrity.
   */
  async remove({ restaurantId = 'resto_001', tableId }) {
    const { error } = await supabase
      .from('restaurant_tables')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId);

    if (error) {
      throw new Error(error.message || 'Failed to delete table.');
    }
  }
};
