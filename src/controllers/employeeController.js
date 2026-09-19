const supabase = require('../config/supabase');

// ======================================
// GET EMPLOYEES
// ======================================

const getEmployees = async (req, res) => {
  try {
    const { owner_id } = req.query;

    if (!owner_id) {
      return res.status(400).json({
        success: false,
        message: 'Owner ID is required',
      });
    }

    const { data, error } = await supabase
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
        status,
        created_at
      `)
      .eq('owner_id', owner_id)
      .eq('role', 'employee')
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error('Get Employees Error:', error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    // Get employee user information
    const employees = [];

    for (const member of data || []) {
      const {
        data: user,
        error: userError,
      } = await supabase
        .from('users')
        .select('id, name, mobile, created_at')
        .eq('id', member.employee_id)
        .maybeSingle();

      if (userError) {
        console.error(
          'Employee User Error:',
          userError
        );
      }

      employees.push({
        ...member,
        employee: user || null,
      });
    }

    return res.json({
      success: true,
      employees,
    });

  } catch (error) {
    console.error('Get Employees Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// INVITE EMPLOYEE
// ======================================

const inviteEmployee = async (req, res) => {
  try {
    const {
      owner_id,
      employee_name,
      employee_mobile,
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
    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    if (!owner_id) {
      return res.status(400).json({
        success: false,
        message: 'Owner ID is required',
      });
    }

    if (!employee_name || !employee_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Employee name is required',
      });
    }

    if (!employee_mobile) {
      return res.status(400).json({
        success: false,
        message: 'Employee mobile number is required',
      });
    }

    if (!/^[0-9]{10}$/.test(employee_mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10 digit mobile number',
      });
    }

    // ======================================
    // CHECK OWNER
    // ======================================

    const {
      data: owner,
      error: ownerError,
    } = await supabase
      .from('users')
      .select('id, mobile')
      .eq('id', owner_id)
      .maybeSingle();

    if (ownerError) {
      console.error(
        'Owner Check Error:',
        ownerError
      );

      return res.status(500).json({
        success: false,
        message: ownerError.message,
      });
    }

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found',
      });
    }

    // Owner cannot invite himself
    if (owner.mobile === employee_mobile) {
      return res.status(400).json({
        success: false,
        message: 'Owner cannot be added as employee',
      });
    }

    // ======================================
    // CHECK EXISTING USER
    // ======================================

    const {
      data: existingEmployee,
      error: employeeError,
    } = await supabase
      .from('users')
      .select('id, name, mobile')
      .eq('mobile', employee_mobile)
      .maybeSingle();

    if (employeeError) {
      console.error(
        'Employee Check Error:',
        employeeError
      );

      return res.status(500).json({
        success: false,
        message: employeeError.message,
      });
    }

    // ======================================
    // IF ALREADY MEMBER
    // ======================================

    if (existingEmployee) {
      const {
        data: existingMember,
        error: memberError,
      } = await supabase
        .from('business_members')
        .select('id, status')
        .eq('owner_id', owner_id)
        .eq('employee_id', existingEmployee.id)
        .maybeSingle();

      if (memberError) {
        console.error(
          'Existing Member Check Error:',
          memberError
        );

        return res.status(500).json({
          success: false,
          message: memberError.message,
        });
      }

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'This employee is already added to your business',
        });
      }
    }

    // ======================================
    // CHECK PENDING INVITE
    // ======================================

    const {
      data: pendingInvite,
      error: pendingError,
    } = await supabase
      .from('employee_invites')
      .select('id')
      .eq('owner_id', owner_id)
      .eq('employee_mobile', employee_mobile)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingError) {
      console.error(
        'Pending Invite Check Error:',
        pendingError
      );

      return res.status(500).json({
        success: false,
        message: pendingError.message,
      });
    }

    if (pendingInvite) {
      return res.status(400).json({
        success: false,
        message: 'An invitation is already pending for this mobile number',
      });
    }

    // ======================================
    // CREATE INVITE
    // ======================================

    const { data: invite, error: inviteError } =
      await supabase
        .from('employee_invites')
        .insert([
          {
            owner_id,
            employee_name: employee_name.trim(),
            employee_mobile,

            access_level:
              access_level || 'custom',

            can_view_customers:
              can_view_customers ?? true,

            can_manage_customers:
              can_manage_customers ?? true,

            can_view_suppliers:
              can_view_suppliers ?? true,

            can_manage_suppliers:
              can_manage_suppliers ?? true,

            can_create_transactions:
              can_create_transactions ?? true,

            can_view_transactions:
              can_view_transactions ?? true,

            can_delete_transactions:
              can_delete_transactions ?? false,

            can_view_reports:
              can_view_reports ?? false,

            can_use_voice:
              can_use_voice ?? true,

            status: 'pending',
          },
        ])
        .select()
        .single();

    if (inviteError) {
      console.error(
        'Create Employee Invite Error:',
        inviteError
      );

      return res.status(500).json({
        success: false,
        message: inviteError.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Employee invitation created successfully',
      invite,
    });

  } catch (error) {
    console.error(
      'Invite Employee Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ======================================
// REMOVE EMPLOYEE
// ======================================

const removeEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { owner_id } = req.body;

    if (!id || !owner_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and Owner ID are required',
      });
    }

    const {
      data: member,
      error: memberError,
    } = await supabase
      .from('business_members')
      .select('id')
      .eq('id', id)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (memberError) {
      console.error(
        'Employee Check Error:',
        memberError
      );

      return res.status(500).json({
        success: false,
        message: memberError.message,
      });
    }

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const {
      error: deleteError,
    } = await supabase
      .from('business_members')
      .update({
        status: 'removed',
      })
      .eq('id', id)
      .eq('owner_id', owner_id);

    if (deleteError) {
      console.error(
        'Remove Employee Error:',
        deleteError
      );

      return res.status(500).json({
        success: false,
        message: deleteError.message,
      });
    }

    return res.json({
      success: true,
      message: 'Employee removed successfully',
    });

  } catch (error) {
    console.error(
      'Remove Employee Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


module.exports = {
  getEmployees,
  inviteEmployee,
  removeEmployee,
};