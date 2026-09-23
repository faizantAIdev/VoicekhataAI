
const supabase = require('../config/supabase');


// =====================================================
// Get Business Owner ID
// =====================================================

const getBusinessOwnerId = async (userId) => {
  const { data: membership, error } = await supabase
    .from('business_members')
    .select('owner_id, status')
    .eq('employee_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Employee
  if (membership) {
    return membership.owner_id;
  }

  // Owner
  return userId;
};


// =====================================================
// Get Employee Membership + Permissions
// =====================================================

const getBusinessMembership = async (userId) => {
  const { data: membership, error } = await supabase
    .from('business_members')
    .select(`
      id,
      owner_id,
      employee_id,
      role,
      access_level,
      can_view_customers,
      can_manage_customers,
      can_view_suppliers,
      can_manage_suppliers,
      can_create_transactions,
      can_view_transactions,
      can_delete_transactions,
      can_view_reports,
      can_use_voice,
      status
    `)
    .eq('employee_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return membership;
};


// =====================================================
// Check Permission
// =====================================================

const checkPermission = async (userId, permission) => {
  const membership = await getBusinessMembership(userId);

  // User is owner
  if (!membership) {
    return {
      allowed: true,
      isOwner: true,
      membership: null,
    };
  }

  // Employee permission
  const allowed = membership[permission] === true;

  return {
    allowed,
    isOwner: false,
    membership,
  };
};


// =====================================================
// Require Permission
// =====================================================

const requirePermission = async (userId, permission) => {
  const result = await checkPermission(userId, permission);

  if (!result.allowed) {
    const error = new Error(
      `Permission denied: ${permission}`
    );

    error.statusCode = 403;

    throw error;
  }

  return result;
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getBusinessOwnerId,
  getBusinessMembership,
  checkPermission,
  requirePermission,
};
