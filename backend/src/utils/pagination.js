/**
 * Sequelize Pagination Utility
 * @param {Object} query - req.query object
 * @param {number} defaultLimit - default page size (User requested 50)
 * @returns {Object} - { limit, offset, page }
 */
export const getPagination = (query, defaultLimit = 50) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || defaultLimit;
    const offset = (page - 1) * limit;

    return { limit, offset, page };
};

/**
 * Formats the response with pagination metadata
 * @param {Object} data - Result of findAndCountAll
 * @param {number} page - current page
 * @param {number} limit - items per page
 * @returns {Object} - { success: true, count, data, meta: { totalItems, totalPages, currentPage } }
 */
export const getPagingData = (data, page, limit) => {
    const { count: totalItems, rows: items } = data;
    const currentPage = page ? +page : 1;
    const totalPages = Math.ceil(totalItems / limit);

    return { 
        totalItems, 
        items, 
        totalPages, 
        currentPage 
    };
};
