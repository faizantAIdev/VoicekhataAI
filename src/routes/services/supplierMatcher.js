const supabase = require('../../config/supabase');
const stringSimilarity = require('string-similarity');


// =====================================================
// NORMALIZE SUPPLIER NAME
// =====================================================

const normalizeName = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(
      /\b(ji|bhai|sir|madam|mr|mrs|ms|supplier|vendor)\b/g,
      ''
    )
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


  const searchName =
    normalizeName(personName);


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
  // EXACT MATCH
  // ===================================================

  const exactMatch =
    suppliers.find((supplier) => {

      return (
        normalizeName(supplier.name) ===
        searchName
      );

    });


  if (exactMatch) {

    return {
      status: 'matched',
      supplier: exactMatch,
      confidence: 1,
    };
  }


  // ===================================================
  // PARTIAL MATCH
  // ===================================================

  const partialMatches =
    suppliers.filter((supplier) => {

      const dbName =
        normalizeName(supplier.name);

      return (
        dbName.includes(searchName) ||
        searchName.includes(dbName)
      );

    });


  if (partialMatches.length === 1) {

    return {
      status: 'matched',
      supplier: partialMatches[0],
      confidence: 0.9,
    };
  }


  if (partialMatches.length > 1) {

    return {
      status: 'multiple_matches',
      suppliers: partialMatches,
    };
  }


  // ===================================================
  // FUZZY MATCH
  // ===================================================

  const matches =
    suppliers
      .map((supplier) => {

        const dbName =
          normalizeName(supplier.name);

        return {
          supplier,

          score:
            stringSimilarity.compareTwoStrings(
              searchName,
              dbName
            ),
        };

      })
      .sort(
        (a, b) =>
          b.score - a.score
      );


  const bestMatch = matches[0];


  // ===================================================
  // STRONG MATCH
  // ===================================================

  if (
    bestMatch &&
    bestMatch.score >= 0.75
  ) {

    return {
      status: 'matched',
      supplier: bestMatch.supplier,
      confidence: bestMatch.score,
    };
  }


  // ===================================================
  // POSSIBLE MATCH
  // ===================================================

  if (
    bestMatch &&
    bestMatch.score >= 0.55
  ) {

    return {
      status: 'possible_match',
      supplier: bestMatch.supplier,
      confidence: bestMatch.score,
    };
  }


  // ===================================================
  // NOT FOUND
  // ===================================================

  return {
    status: 'not_found',
    supplier: null,
  };
};


module.exports = {
  findSupplierByName,
};