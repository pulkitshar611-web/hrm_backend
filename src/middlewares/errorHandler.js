const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    let message = err.message || "An internal server error occurred";
    let statusCode = err.status || 500;
    let errorCode = err.code || "INTERNAL_SERVER_ERROR";

    if (err.name === 'PrismaClientKnownRequestError') {
        if (err.code === 'P2002') {
            message = "A record with this unique field already exists";
            statusCode = 409;
            errorCode = "DUPLICATE_RECORD";
        } else if (err.code === 'P2025') {
            message = "Record not found";
            statusCode = 404;
            errorCode = "NOT_FOUND";
        }
    }

    // Handle Unauthorized/JWT errors if needed specifically
    if (err.name === 'UnauthorizedError' || err.message === 'jwt expired') {
        message = "Session expired, please login again";
        statusCode = 401;
        errorCode = "UNAUTHORIZED";
    }

    return errorResponse(res, message, errorCode, statusCode);
};

module.exports = errorHandler;
