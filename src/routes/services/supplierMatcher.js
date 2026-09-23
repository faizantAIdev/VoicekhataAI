const supabase = require('../../config/supabase');


// =====================================================
// NORMALIZE SUPPLIER NAME
// =====================================================

const normalizeName = (name) => {
  return String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(
      /\b(ji|bhai|sir|madam|mr|mrs|ms|supplier|vendor)\b/g,
      ' '
    )
    .replace(/[.,/\\()[\]{}'"`_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};


// =====================================================
// FIND SUPPLIER BY NAME
// =====================================================

const findSupplierByName = async (
  userId,
  personName
) => {

  if (!userId || !personName) {
    return {
      status: 'not_found',
      supplier: null,
    };
  }


  const searchName = normalizeName(personName);


  if (!searchName) {
    return {
      status: 'not_found',
      supplier: null,
    };
  }


  // ===================================================
  // GET USER SUPPLIERS
  // ===================================================

  const {
    data: suppliers,
    error,
  } = await supabase
    .from('suppliers')
    .select('id, name, mobile')
    .eq('user_id', userId);


  if (error) {

    console.error(
      'Supplier Match Error:',
      error
    );

    throw error;
  }


  if (!suppliers || suppliers.length === 0) {

    return {
      status: 'not_found',
      supplier: null,
    };
  }


  // ===================================================
  // 1. EXACT NORMALIZED MATCH
  // ===================================================

  const exactMatches =
    suppliers.filter((supplier) => {

      return (
        normalizeName(supplier.name) ===
        searchName
      );

    });


  if (exactMatches.length === 1) {

    return {
      status: 'matched',
      supplier: exactMatches[0],
      confidence: 1,
    };
  }


  if (exactMatches.length > 1) {

    return {
      status: 'multiple_matches',
      suppliers: exactMatches,
      confidence: 1,
    };
  }


  // ===================================================
  // 2. CONTROLLED TOKEN MATCH
  // ===================================================
  //
  // Example:
  //
  // User says:
  // "NK Traders"
  //
  // Database:
  // "NK Traders Pvt Ltd"
  //
  // Result:
  // MATCH
  //
  // But:
  //
  // "NK Traders"
  // "Paras Trader"
  //
  // Result:
  // NOT FOUND
  //
  // This prevents dangerous fuzzy matching.
  // ===================================================

  const searchTokens =
    searchName
      .split(' ')
      .filter(Boolean);


  const controlledMatches =
    suppliers.filter((supplier) => {

      const dbName =
        normalizeName(supplier.name);

      const dbTokens =
        dbName
          .split(' ')
          .filter(Boolean);


      return searchTokens.every((token) =>
        dbTokens.includes(token)
      );

    });


  if (controlledMatches.length === 1) {

    return {
      status: 'matched',
      supplier: controlledMatches[0],
      confidence: 0.95,
    };
  }


  if (controlledMatches.length > 1) {

    return {
      status: 'multiple_matches',
      suppliers: controlledMatches,
      confidence: 0.9,
    };
  }


  // ===================================================
  // 3. NO AUTOMATIC FUZZY MATCH
  // ===================================================
  //
  // IMPORTANT:
  //
  // Do NOT do:
  //
  // NK Traders -> Paras Trader
  //
  // just because string similarity is high.
  //
  // Financial transactions must never be assigned
  // to another supplier based only on fuzzy similarity.
  // ===================================================

  return {
    status: 'not_found',
    supplier: null,
  };
};


// =====================================================
// EXPORT
// =====================================================

module.exports = {
  findSupplierByName,
};